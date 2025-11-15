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
    internal sealed class PushDeltaService : IDisposable
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

        private readonly ExtensionHttpClient http;
        private readonly LocalStateStore snapshotStore;
        private readonly LocalStateService localState;

        private readonly object libEventLock = new object();
        private readonly object mediaEventLock = new object();
        private DateTime lastLibEventTime = DateTime.MinValue;
        private DateTime lastMediaEventTime = DateTime.MinValue;
        private const int RapidEventThresholdMs = 100;

        /// <summary>
        /// Constructs a new instance of the PushDeltaService.
        /// </summary>
        public PushDeltaService(
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

            http = new ExtensionHttpClient(blog);

            var extDataDir = Path.Combine(api.Paths.ExtensionsDataPath, AppConstants.GUID);
            Directory.CreateDirectory(extDataDir);
            snapshotStore = new LocalStateStore(extDataDir, blog);
            localState = new LocalStateService(api, this.dataRoot, blog);

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
        public void UpdateEndpoints(string endpoint)
        {
            syncUrl = (endpoint ?? "").TrimEnd('/');
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
                var prev = snapshotStore.Load();
                var cur = localState.BuildSnapshot(fullRescan: true); // full scan at startup

                var firstRun = (prev.DbTicks == 0 && prev.MediaVersions.Count == 0);
                if (firstRun)
                {
                    dbDirty = true;
                    foreach (var name in cur.MediaVersions.Keys)
                    {
                        localState.MarkMediaFolderDirty(name);
                    }
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
                            localState.MarkMediaFolderDirty(name);
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
                    debounceMs = AppConstants.Debounce_Ms,
                }
            );
        }

        /// <summary>
        /// Run a "hard" sync: delete snapshot, mark everything dirty, then trigger sync.
        /// </summary>
        public void HardSync()
        {
            try
            {
                snapshotStore.Delete();
            }
            catch
            {
                // non-fatal
            }

            try
            {
                var cur = localState.BuildSnapshot(fullRescan: true);

                dbDirty = true;
                foreach (var name in cur.MediaVersions.Keys)
                {
                    localState.MarkMediaFolderDirty(name);
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

            Trigger();
        }

        /// <summary>
        /// Trigger a sync run (debounced).
        /// </summary>
        public void Trigger()
        {
            if (!isHealthy())
            {
                blog?.Debug("sync", "Skipped trigger: unhealthy");
                return;
            }
            dirtyFlag = true;
            debounceTimer?.Change(AppConstants.Debounce_Ms, Timeout.Infinite);
            blog?.Info("sync", "Manual/auto CRUD sync trigger queued");
        }

        /// <summary>
        /// Dispose watchers and timer.
        /// </summary>
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

        /// <summary>
        /// Library change event handler.
        /// </summary>
        private void OnLibraryChanged(object s, FileSystemEventArgs e)
        {
            dbDirty = true;
            lock (libEventLock)
            {
                var now = DateTime.UtcNow;
                if ((now - lastLibEventTime).TotalMilliseconds < RapidEventThresholdMs)
                {
                    blog?.Debug("sync", "Rapid library change event - skipping duplicate Trigger");
                    return;
                }
                lastLibEventTime = now;
            }
            Trigger();
        }

        /// <summary>
        /// Media change event handler.
        /// </summary>
        private void OnMediaChanged(object s, FileSystemEventArgs e)
        {
            var top = PathHelpers.GetTopLevelMediaFolderFromPath(dataRoot, e.FullPath);
            lock (mediaEventLock)
            {
                var now = DateTime.UtcNow;
                if (!string.IsNullOrWhiteSpace(top))
                {
                    localState.MarkMediaFolderDirty(top);
                }
                if ((now - lastMediaEventTime).TotalMilliseconds < RapidEventThresholdMs)
                {
                    blog?.Debug("sync", "Rapid media change event - skipping duplicate Trigger");
                    return;
                }
                lastMediaEventTime = now;
            }
            Trigger();
        }

        /// <summary>
        /// Debounced async handler.
        /// </summary>
        private async Task DebouncedAsync()
        {
            try
            {
                if (isRunning)
                    return;
                if (!dirtyFlag && !dbDirty && localState.DirtyMediaFolderCount == 0)
                    return;
                if (!isHealthy())
                {
                    blog?.Debug("sync", "Abort: became unhealthy");
                    return;
                }

                isRunning = true;
                await PushCrudAsync().ConfigureAwait(false);
            }
            finally
            {
                isRunning = false;
            }
        }

        /// <summary>
        /// Build client inventory and post to /delta, then apply returned delta.
        /// Also upload dirty media folders.
        /// </summary>
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

        /// <summary>
        /// Delta response from server.
        /// </summary>
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

        /// <summary>
        /// Build client inventory from Playnite DB.
        /// </summary>
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
            m.installed.hash = Crypto.Sha1(string.Join(",", installedIds));
            return m;
        }

        /// <summary>
        /// Perform the push CRUD sync: delta + media uploads + snapshot update.
        /// </summary>
        private async Task PushCrudAsync()
        {
            var swTotal = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                // Snapshot dirty folders WITHOUT clearing them; clearing is done by BuildSnapshot(false)
                var mediaFolders = localState.DirtyMediaFoldersSnapshot();

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

                // 2) Media uploads for the dirty top-level folders we saw at start
                if (mediaFolders.Count > 0)
                {
                    await UploadMediaFoldersAsync(mediaFolders).ConfigureAwait(false);
                }

                blog?.Info("sync", "CRUD sync complete");
                blog?.Debug(
                    "sync",
                    "CRUD sync stats",
                    new { mediaFolders, totalMs = swTotal.ElapsedMilliseconds }
                );

                try
                {
                    // 3) Refresh local snapshot & clear processed dirty flags
                    var snap = localState.BuildSnapshot(fullRescan: false);

                    // Persist locally
                    snapshotStore.Save(snap);

                    // Push snapshot to server (same JSON shape as before)
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
                    blog?.Warn("sync", "Failed to save/upload snapshot", new { err = ex.Message });
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

        /// <summary>
        /// Post client inventory to /delta and get delta response.
        /// </summary>
        private Task<DeltaResponse?> PostDeltaAsync(ClientInventory inventory) =>
            http.GetDeltaAsync<DeltaResponse>(syncUrl, inventory);

        /// <summary>
        /// Apply the delta response to local Playnite DB.
        /// </summary>
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

        /// <summary>
        /// Build JSON for an entity by collection and ID.
        /// </summary>
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

        /// <summary>
        /// Upload dirty media folders.
        /// </summary>
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

        /// <summary>
        /// Combine base URL and path segments.
        /// </summary>
        private static string Combine(string baseUrl, string path)
        {
            baseUrl = (baseUrl ?? string.Empty).TrimEnd('/');
            path = (path ?? string.Empty).TrimStart('/');
            return baseUrl + "/" + path;
        }
    }
}
