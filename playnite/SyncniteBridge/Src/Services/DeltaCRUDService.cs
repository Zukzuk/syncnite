using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Orchestrates CRUD + media binary sync using /sync endpoints.
    /// Preserves: watchers, debounce, health-gating, notifications, snapshots.
    /// </summary>
    internal sealed class DeltaCRUDService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private readonly BridgeLogger? blog;
        private readonly string dataRoot;
        private readonly FileSystemWatcher libWatcher;
        private readonly FileSystemWatcher mediaWatcher;
        private readonly Timer debounceTimer;

        private string syncUrl = null!;
        private volatile bool isRunning = false;
        private volatile bool dirtyFlag = false;
        private volatile bool dbDirty = false;

        private Func<bool> isHealthy = () => true;

        private readonly HttpClientEx http;
        private readonly SnapshotService snapshot;
        private readonly LocalStateScanService scanner;
        private readonly MediaChangeService mediaChanges = new MediaChangeService();

        public DeltaCRUDService(
            IPlayniteAPI api,
            string syncUrl,
            string dataRoot,
            BridgeLogger? blog = null
        )
        {
            this.api = api;
            this.blog = blog;
            this.dataRoot = dataRoot ?? "";
            this.syncUrl = (syncUrl ?? "").TrimEnd('/');

            http = new HttpClientEx(blog);

            var myExtDataDir = Path.Combine(api.Paths.ExtensionsDataPath, AppConstants.GUID);
            Directory.CreateDirectory(myExtDataDir);
            snapshot = new SnapshotService(myExtDataDir, blog);
            scanner = new LocalStateScanService(api, this.dataRoot, blog);

            var libDir = Path.Combine(this.dataRoot, AppConstants.LibraryDirName);
            Directory.CreateDirectory(libDir);
            libWatcher = new FileSystemWatcher(libDir)
            {
                Filter = "*.db",
                IncludeSubdirectories = false,
                NotifyFilter =
                    NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.CreationTime,
            };
            libWatcher.Created += OnLibraryChanged;
            libWatcher.Changed += OnLibraryChanged;
            libWatcher.Renamed += OnLibraryChanged;
            libWatcher.Deleted += OnLibraryChanged;

            var mediaDir = Path.Combine(this.dataRoot, AppConstants.LibraryFilesDirName);
            Directory.CreateDirectory(mediaDir);
            mediaWatcher = new FileSystemWatcher(mediaDir)
            {
                Filter = "*.*",
                IncludeSubdirectories = true,
                NotifyFilter =
                    NotifyFilters.DirectoryName
                    | NotifyFilters.FileName
                    | NotifyFilters.LastWrite
                    | NotifyFilters.CreationTime,
            };
            mediaWatcher.Created += OnMediaChanged;
            mediaWatcher.Changed += OnMediaChanged;
            mediaWatcher.Renamed += OnMediaChanged;
            mediaWatcher.Deleted += OnMediaChanged;

            debounceTimer = new Timer(
                _ => DebouncedAsync().ConfigureAwait(false),
                null,
                Timeout.Infinite,
                Timeout.Infinite
            );
        }

        /// <summary>
        /// Update sync base (…/api/sync)
        /// </summary>
        public void UpdateEndpoints(string newSyncUrl)
        {
            syncUrl = (newSyncUrl ?? "").TrimEnd('/');
            blog?.Debug("sync", "CRUD endpoints updated", new { syncUrl });
        }

        /// <summary>
        /// Provide health status (true = healthy)
        /// </summary>
        public void SetHealthProvider(Func<bool> provider) => isHealthy = provider ?? (() => true);

        /// <summary>
        /// Start watchers and do initial diff vs. last snapshot
        /// </summary>
        public void Start()
        {
            try
            {
                var prev = snapshot.Load();
                var cur = scanner.BuildSnapshot();

                var firstRun = (prev.DbTicks == 0 && prev.MediaVersions.Count == 0);
                if (firstRun)
                {
                    dbDirty = true;
                    foreach (var name in cur.MediaVersions.Keys)
                        mediaChanges.Add(name);
                    blog?.Info("sync", "Initial seed prepared (first run)");
                    blog?.Debug(
                        "sync",
                        "Initial diff prepared (first run)",
                        new { json = true, mediaFolders = cur.MediaVersions.Count }
                    );
                }
                else
                {
                    if (cur.DbTicks != prev.DbTicks)
                        dbDirty = true;

                    var changed = 0;
                    foreach (var kv in cur.MediaVersions)
                    {
                        var name = kv.Key;
                        var curVer = kv.Value;
                        prev.MediaVersions.TryGetValue(name, out var oldVer);
                        if (curVer != oldVer)
                        {
                            mediaChanges.Add(name);
                            changed++;
                        }
                    }
                    blog?.Debug(
                        "sync",
                        "Initial diff prepared",
                        new { json = dbDirty, mediaChanged = changed }
                    );
                }
            }
            catch (Exception ex)
            {
                blog?.Warn("sync", "Initial snapshot diff failed", new { err = ex.Message });
            }

            libWatcher.EnableRaisingEvents = true;
            mediaWatcher.EnableRaisingEvents = true;

            blog?.Info("sync", "CRUD sync started and watchers attached");
            blog?.Debug(
                "sync",
                "Watching paths",
                new
                {
                    libraryDir = Path.Combine(dataRoot, AppConstants.LibraryDirName),
                    mediaDir = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName),
                    debounceMs = AppConstants.DebounceMs_Sync,
                }
            );

            Task.Run(() =>
            {
                if (isHealthy())
                {
                    blog?.Info("startup", "Health healthy → trigger CRUD sync");
                    Trigger();
                }
                else
                {
                    blog?.Debug("sync", "Skipped trigger: unhealthy");
                }
            });
        }

        /// <summary>
        /// Run a "hard" sync: delete snapshot, mark everything dirty, then trigger sync.
        /// </summary>
        public void HardSync()
        {
            // 1) Delete snapshot.json so next snapshot is a fresh baseline
            try
            {
                snapshot.Delete();
            }
            catch
            {
                // non-fatal; we can still force a rescan
            }

            // 2) Mark DB + all media folders as dirty, similar to first run
            try
            {
                var cur = scanner.BuildSnapshot();

                dbDirty = true;
                foreach (var name in cur.MediaVersions.Keys)
                {
                    mediaChanges.Add(name);
                }

                blog?.Info("sync", "Hard sync prepared (snapshot reset)");
                blog?.Debug(
                    "sync",
                    "Hard sync details",
                    new { mediaFolders = cur.MediaVersions.Count }
                );
            }
            catch (Exception ex)
            {
                blog?.Warn("sync", "Hard sync prep failed", new { err = ex.Message });
            }

            // 3) Kick the normal sync pipeline (health-gated, debounced)
            Trigger();
        }

        public void Trigger()
        {
            if (!isHealthy())
            {
                blog?.Debug("sync", "Skipped trigger: unhealthy");
                return;
            }
            dirtyFlag = true;
            debounceTimer?.Change(AppConstants.DebounceMs_Sync, Timeout.Infinite);
            blog?.Info("sync", "Manual/auto CRUD sync trigger queued");
        }

        public void Dispose()
        {
            try
            {
                libWatcher?.Dispose();
            }
            catch { }
            try
            {
                mediaWatcher?.Dispose();
            }
            catch { }
            try
            {
                debounceTimer?.Dispose();
            }
            catch { }
        }

        private void OnLibraryChanged(object s, FileSystemEventArgs e)
        {
            dbDirty = true;
            Trigger();
        }

        private void OnMediaChanged(object s, FileSystemEventArgs e)
        {
            var top = PathHelpers.GetTopLevelMediaFolderFromPath(dataRoot, e.FullPath);
            if (!string.IsNullOrWhiteSpace(top))
                mediaChanges.Add(top!);
            Trigger();
        }

        private async Task DebouncedAsync()
        {
            try
            {
                if (isRunning)
                    return;
                if (!dirtyFlag && !dbDirty && mediaChanges.Count == 0)
                    return;
                if (!isHealthy())
                {
                    blog?.Debug("sync", "Abort: became unhealthy");
                    return;
                }

                isRunning = true;
                await RunCrudSyncIfNeededAsync().ConfigureAwait(false);
            }
            finally
            {
                isRunning = false;
            }
        }

        // ------------------------- CRUD core -------------------------

        private sealed class ClientInventory
        {
            public Dictionary<string, string[]> json { get; set; } =
                new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

            public InstalledSummary installed { get; set; } = new InstalledSummary();

            internal sealed class InstalledSummary
            {
                public int count { get; set; }
                public string hash { get; set; } = "";
            }
        }

        private sealed class DeltaResponse
        {
            public bool ok { get; set; }
            public Delta delta { get; set; } = new Delta();

            internal sealed class Delta
            {
                public Dictionary<string, string[]> toUpsert { get; set; } =
                    new(StringComparer.OrdinalIgnoreCase);
                public Dictionary<string, string[]> toDelete { get; set; } =
                    new(StringComparer.OrdinalIgnoreCase);
            }
        }

        private ClientInventory BuildClientInventory()
        {
            var m = new ClientInventory();

            // Build ID lists from Playnite DB (only collections we support)
            m.json["games"] = api.Database.Games.Select(g => g.Id.ToString()).ToArray();
            m.json["tags"] =
                api.Database.Tags?.Select(t => t.Id.ToString()).ToArray() ?? Array.Empty<string>();
            m.json["companies"] =
                api.Database.Companies?.Select(c => c.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["sources"] =
                api.Database.Sources?.Select(s => s.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["platforms"] =
                api.Database.Platforms?.Select(p => p.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["genres"] =
                api.Database.Genres?.Select(g => g.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["categories"] =
                api.Database.Categories?.Select(c => c.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["features"] =
                api.Database.Features?.Select(f => f.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["series"] =
                api.Database.Series?.Select(s => s.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["regions"] =
                api.Database.Regions?.Select(r => r.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["ageratings"] =
                api.Database.AgeRatings?.Select(a => a.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["completionstatuses"] =
                api.Database.CompletionStatuses?.Select(cs => cs.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["filterpresets"] =
                api.Database.FilterPresets?.Select(fp => fp.Id.ToString()).ToArray()
                ?? Array.Empty<string>();
            m.json["importexclusions"] =
                api.Database.ImportExclusions?.Select(ix => ix.Id.ToString()).ToArray()
                ?? Array.Empty<string>();

            // Installed signature: count + hash (sorted ids)
            var installedIds = api
                .Database.Games.Where(g => g.IsInstalled)
                .Select(g => g.Id.ToString())
                .OrderBy(id => id, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            m.installed.count = installedIds.Length;
            m.installed.hash = HashUtil.Sha1(string.Join(",", installedIds));
            return m;
        }

        private async Task RunCrudSyncIfNeededAsync()
        {
            var swTotal = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                var mediaFolders = mediaChanges.Snapshot();
                if (!dbDirty && mediaFolders.Count == 0)
                {
                    blog?.Debug("sync", "Up-to-date; no CRUD work needed");
                    return;
                }

                // 1) DB delta phase
                if (dbDirty)
                {
                    var inventory = BuildClientInventory();
                    var delta = await PostDeltaAsync(inventory).ConfigureAwait(false);
                    if (delta == null || !delta.ok)
                        throw new Exception("delta endpoint returned non-OK");

                    blog?.Info("sync", "Applying DB delta");
                    await ApplyDbDeltaAsync(delta.delta).ConfigureAwait(false);
                    dbDirty = false;
                }

                // 2) Media uploads
                if (mediaFolders.Count > 0)
                {
                    await UploadMediaFoldersAsync(mediaFolders).ConfigureAwait(false);
                    mediaChanges.Clear();
                }

                blog?.Info("sync", "CRUD sync complete");
                blog?.Debug(
                    "sync",
                    "CRUD sync stats",
                    new { mediaFolders, totalMs = swTotal.ElapsedMilliseconds }
                );

                try
                {
                    var snap = scanner.BuildSnapshot();
                    blog?.Debug("sync", "Saved snapshot");
                    // Push snapshot to server (fire-and-forget-ish, but we await for logging)
                    var pushed = await http.UploadSnapshotAsync(syncUrl, snap)
                        .ConfigureAwait(false);
                    if (!pushed)
                    {
                        blog?.Warn(
                            "sync",
                            "Snapshot upload to server failed (see logs), continuing."
                        );
                    }
                    else
                    {
                        blog?.Info("sync", "Snapshot uploaded to server.");
                    }
                }
                catch (Exception ex)
                {
                    blog?.Warn("sync", "Failed to save snapshot", new { err = ex.Message });
                }

                if (dirtyFlag)
                {
                    dirtyFlag = false;
                    blog?.Debug("sync", "Processing dirty re-run");
                    Trigger();
                }
            }
            catch (Exception ex)
            {
                blog?.Error(
                    "sync",
                    "CRUD sync failed",
                    data: new { totalMs = swTotal.ElapsedMilliseconds },
                    err: ex.Message
                );
                api?.Notifications?.Add(
                    AppConstants.Notif_Sync_Error,
                    "CRUD Sync failed",
                    NotificationType.Error
                );
            }
        }

        // use HttpClientEx for delta
        private Task<DeltaResponse?> PostDeltaAsync(ClientInventory inventory) =>
            http.GetDeltaAsync<DeltaResponse>(syncUrl, inventory);

        private async Task ApplyDbDeltaAsync(DeltaResponse.Delta delta)
        {
            // Upserts
            foreach (var kv in delta.toUpsert)
            {
                var collection = kv.Key;
                foreach (var id in kv.Value)
                {
                    var json = BuildEntityJson(collection, id);
                    if (json == null)
                    {
                        blog?.Warn("sync", "Entity missing locally", new { collection, id });
                        continue;
                    }
                    await http.UpsertEntityAsync(syncUrl, collection, id, json)
                        .ConfigureAwait(false);
                }
            }

            // Deletes
            foreach (var kv in delta.toDelete)
            {
                var collection = kv.Key;
                foreach (var id in kv.Value)
                {
                    await http.DeleteEntityAsync(syncUrl, collection, id).ConfigureAwait(false);
                }
            }
        }

        private string? BuildEntityJson(string collection, string id)
        {
            // Map Playnite entities to a stable JSON schema the server expects.
            if (collection.Equals("games", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var g = api.Database.Games.Get(gid);
                if (g == null)
                    return null;

                // match projection schema
                var obj = new
                {
                    g.Id,
                    g.Name,
                    g.SortingName,
                    g.Hidden,
                    g.IsInstalled,
                    g.InstallDirectory,
                    g.InstallSize,
                    g.PluginId,
                    g.GameId,
                    g.SourceId,
                    TagIds = (g.TagIds ?? new List<Guid>()).ToList(),
                    PlatformIds = (g.PlatformIds ?? new List<Guid>()).ToList(),
                    PrimaryPlatformId = (g.PlatformIds != null && g.PlatformIds.Count > 0)
                        ? (Guid?)g.PlatformIds[0]
                        : null,
                    g.GenreIds,
                    g.CategoryIds,
                    g.FeatureIds,
                    SeriesIds = g.SeriesIds,
                    PrimarySeriesId = (g.SeriesIds != null && g.SeriesIds.Count > 0)
                        ? (Guid?)g.SeriesIds[0]
                        : null,
                    g.CompletionStatusId,
                    g.AgeRatingIds,
                    g.RegionIds,
                    g.DeveloperIds,
                    g.PublisherIds,
                    g.ReleaseDate,
                    ReleaseYear = (int?)g.ReleaseDate?.Year,
                    g.Icon,
                    g.CoverImage,
                    g.BackgroundImage,
                    g.Added,
                    g.Modified,
                    g.LastActivity,
                    g.Playtime,
                    g.PlayCount,
                    g.UserScore,
                    g.CommunityScore,
                    g.CriticScore,
                    g.Description,
                    g.Notes,
                    g.Links,
                    g.GameActions,
                    g.Roms,
                };
                return Playnite.SDK.Data.Serialization.ToJson(obj);
            }

            // helpers
            object MapNamed(Guid guid, string? name) => new { Id = guid, Name = name ?? "" };

            if (!Guid.TryParse(id, out var any))
                return null;

            if (collection.Equals("tags", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.Tags?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }
            if (collection.Equals("companies", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.Companies?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }
            if (collection.Equals("sources", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.Sources?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }
            if (collection.Equals("platforms", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.Platforms?.Get(any);
                if (e == null)
                    return null;
                var obj = new
                {
                    e.Id,
                    e.Name,
                    e.Icon,
                };
                return Playnite.SDK.Data.Serialization.ToJson(obj);
            }
            if (collection.Equals("genres", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.Genres?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }
            if (collection.Equals("categories", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.Categories?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }
            if (collection.Equals("features", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.Features?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }
            if (collection.Equals("series", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.Series?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }
            if (collection.Equals("regions", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.Regions?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }
            if (collection.Equals("ageratings", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.AgeRatings?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }
            if (collection.Equals("completionstatuses", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.CompletionStatuses?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }
            if (collection.Equals("filterpresets", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.FilterPresets?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(new { e.Id, e.Name });
            }
            if (collection.Equals("importexclusions", StringComparison.OrdinalIgnoreCase))
            {
                var e = api.Database.ImportExclusions?.Get(any);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(MapNamed(e.Id, e.Name));
            }

            return null;
        }

        private async Task UploadMediaFoldersAsync(List<string> topLevelFolders)
        {
            var mediaRoot = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName);

            foreach (var folder in topLevelFolders)
            {
                var folderAbs = Path.Combine(mediaRoot, folder);
                if (!Directory.Exists(folderAbs))
                    continue;

                blog?.Info("sync", "Uploading media folder");
                blog?.Debug("sync", "Media folder details", new { folder });

                foreach (
                    var path in Directory.EnumerateFiles(
                        folderAbs,
                        "*",
                        SearchOption.AllDirectories
                    )
                )
                {
                    var relInsideTop = PathHelpers.GetRelativePath(folderAbs, path);
                    var relInMediaTree = Path.Combine(folder, relInsideTop).Replace('\\', '/');

                    try
                    {
                        await http.UploadMediaAsync(syncUrl, relInMediaTree, path)
                            .ConfigureAwait(false);
                    }
                    catch (Exception ex)
                    {
                        blog?.Warn("sync", "Skip media file", new { path, err = ex.Message });
                    }
                }
            }
        }

        private static string Combine(string baseUrl, string path)
        {
            baseUrl = (baseUrl ?? string.Empty).TrimEnd('/');
            path = (path ?? string.Empty).TrimStart('/');
            return baseUrl + "/" + path;
        }
    }
}
