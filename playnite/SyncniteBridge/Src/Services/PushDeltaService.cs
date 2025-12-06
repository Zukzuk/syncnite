using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Playnite.SDK;
using Playnite.SDK.Models;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;
using SyncniteBridge.Models;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Orchestrates CRUD + media binary sync using endpoints.
    /// Now driven entirely by DB events (via ChangeDetection) and snapshots – no file watchers.
    /// </summary>
    internal sealed class PushDeltaService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private readonly BridgeLogger? blog;
        private readonly string dataRoot;
        private readonly Timer debounceTimer;

        private string syncUrl = null!;
        private volatile bool isRunning = false;
        private volatile bool dirtyFlag = false;
        private volatile bool dbDirty = false;

        private Func<bool> isHealthy = () => true;

        private readonly ExtensionHttpClient http;
        private readonly LocalStateStore snapshotStore;
        private readonly LocalStateService localState;

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

            debounceTimer = new Timer(
                _ => DebouncedAsync().ConfigureAwait(false),
                null,
                Timeout.Infinite,
                Timeout.Infinite
            );
        }

        /// <summary>
        /// Update sync base (…/api/playnite)
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
        /// Start logic: compare existing snapshot with current state to decide if we need an initial sync.
        /// No file watchers are used anymore; ongoing changes come from ChangeDetection.
        /// </summary>
        public void Start()
        {
            try
            {
                var previous = snapshotStore.Load() ?? new LocalStateSnapshot();
                var current =
                    localState.BuildSnapshot(fullRescan: true) ?? new LocalStateSnapshot();

                previous.MediaVersions ??= new Dictionary<string, long>(
                    StringComparer.OrdinalIgnoreCase
                );
                current.MediaVersions ??= new Dictionary<string, long>(
                    StringComparer.OrdinalIgnoreCase
                );

                var firstRun =
                    previous.DbTicks == 0
                    && (previous.MediaVersions == null || previous.MediaVersions.Count == 0);

                if (firstRun)
                {
                    dbDirty = true;

                    foreach (var folder in current.MediaVersions.Keys)
                    {
                        localState.MarkMediaFolderDirty(folder);
                    }

                    blog?.Info("sync", "Initial CRUD sync required (no previous snapshot)");
                    blog?.Debug(
                        "sync",
                        "Initial snapshot",
                        new { current.DbTicks, mediaFolders = current.MediaVersions.Count }
                    );
                }
                else
                {
                    if (current.DbTicks != previous.DbTicks)
                    {
                        dbDirty = true;
                    }

                    var changedFolders = 0;
                    foreach (
                        var kv in current.MediaVersions
                            ?? Enumerable.Empty<KeyValuePair<string, long>>()
                    )
                    {
                        var folder = kv.Key;
                        var ticksNow = kv.Value;
                        var ticksPrev =
                            (
                                previous.MediaVersions != null
                                && previous.MediaVersions.TryGetValue(folder, out var t)
                            )
                                ? t
                                : 0;

                        if (ticksNow != ticksPrev)
                        {
                            localState.MarkMediaFolderDirty(folder);
                            changedFolders++;
                        }
                    }

                    blog?.Debug(
                        "sync",
                        "Initial snapshot diff results",
                        new
                        {
                            prevTicks = previous.DbTicks,
                            curTicks = current.DbTicks,
                            prevMedia = previous.MediaVersions?.Count ?? 0,
                            curMedia = current.MediaVersions?.Count ?? 0,
                            dbDirty,
                            mediaFoldersChanged = changedFolders,
                        }
                    );
                }
            }
            catch (Exception ex)
            {
                blog?.Warn(
                    "sync",
                    "Failed to prepare initial snapshot diff",
                    new { err = ex.Message }
                );
            }

            blog?.Info("sync", "CRUD sync started (DB-event driven, no file watchers)");
            blog?.Debug("sync", "Engine ready", new { debounceMs = AppConstants.Debounce_Ms });
        }

        /// <summary>
        /// Run a full sync: force DB + media rescan and trigger push.
        /// </summary>
        public void HardSync()
        {
            dbDirty = true;

            // Mark all media folders dirty so next snapshot rescans everything
            localState.MarkAllMediaFoldersDirty();

            dirtyFlag = true;
            blog?.Info("sync", "Hard sync requested");
            Trigger();
        }

        /// <summary>
        /// Called by ChangeDetection whenever *metadata* changes (excluding pure IsInstalled toggles).
        /// </summary>
        public void OnMetadataChanged(IReadOnlyList<Playnite.SDK.Models.Game> _)
        {
            // Metadata changed (name, tags, hidden, etc.) – this affects DB hash,
            // but we *don’t* want to blindly reupload all media.
            dbDirty = true;
            blog?.Debug("sync", "DB metadata changed -> marking DB dirty (no global media dirty)");
            Trigger();
        }

        /// <summary>
        /// Called by ChangeDetection whenever game media paths (Icon/Cover/Background) change.
        /// Marks only the relevant media folders as dirty.
        /// </summary>
        public void OnMediaChanged(IReadOnlyList<Game> games)
        {
            if (games == null || games.Count == 0)
                return;

            foreach (var g in games)
            {
                MarkMediaFolderFromPath(g.Icon);
                MarkMediaFolderFromPath(g.CoverImage);
                MarkMediaFolderFromPath(g.BackgroundImage);
            }

            blog?.Debug(
                "sync",
                "Game media changed -> marking media folders dirty",
                new { dirtyFolders = localState.DirtyMediaFolderCount }
            );

            // No need to mark dbDirty here; changing only media paths doesn't require DB delta
            Trigger();
        }

        /// <summary>
        /// Extracts the top-level media folder from a game media path and marks it dirty.
        /// Example: "0a0a55c3-...\\image.png" -> "0a0a55c3-..." (folder name).
        /// </summary>
        private void MarkMediaFolderFromPath(string? mediaPath)
        {
            if (string.IsNullOrWhiteSpace(mediaPath))
                return;

            // Normalize separators
            var norm = mediaPath?.Replace('\\', '/')?.Trim() ?? string.Empty;
            if (norm.Length == 0)
                return;

            var slashIdx = norm.IndexOf('/');
            var folder = slashIdx >= 0 ? norm.Substring(0, slashIdx) : norm;

            if (string.IsNullOrWhiteSpace(folder))
                return;

            localState.MarkMediaFolderDirty(folder);
        }

        /// <summary>
        /// Signal that a change occurred; will debounce and then push if healthy.
        /// </summary>
        public void Trigger()
        {
            if (!isHealthy())
            {
                blog?.Debug("sync", "Trigger skipped: unhealthy");
                return;
            }

            dirtyFlag = true;

            try
            {
                debounceTimer.Change(AppConstants.Debounce_Ms, Timeout.Infinite);
            }
            catch { }
        }

        /// <summary>
        /// Dispose underlying resources.
        /// </summary>
        public void Dispose()
        {
            try
            {
                debounceTimer?.Dispose();
            }
            catch { }
        }

        /// <summary>
        /// Debounced async handler.
        /// </summary>
        private async Task DebouncedAsync()
        {
            await AppConstants.SyncLocks.GlobalSyncLock.WaitAsync().ConfigureAwait(false);
            try
            {
                if (isRunning)
                    return; // extra safety against weird reentrancy

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
                AppConstants.SyncLocks.GlobalSyncLock.Release();
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

            /// <summary>
            /// Per-collection metadata versions:
            ///   e.g. "games" -> { gameId -> versionToken }
            /// Version token is an opaque string (SHA1 of key fields).
            /// </summary>
            public Dictionary<string, Dictionary<string, string>> versions { get; set; } =
                new Dictionary<string, Dictionary<string, string>>(
                    StringComparer.OrdinalIgnoreCase
                );

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
        /// Stable version token for a game, based on metadata (NOT installed flag).
        /// This is what will drive CRUD deltas for the "games" collection.
        /// </summary>
        private static string ComputeGameVersion(Playnite.SDK.Models.Game g)
        {
            string payload = string.Join(
                "|",
                g.Id.ToString(),
                g.Name ?? "",
                g.SortingName ?? "",
                g.Hidden.ToString(),
                g.SourceId.ToString(),
                string.Join(",", g.TagIds ?? new List<Guid>()),
                string.Join(",", g.PlatformIds ?? new List<Guid>()),
                string.Join(",", g.GenreIds ?? new List<Guid>()),
                string.Join(",", g.CategoryIds ?? new List<Guid>()),
                string.Join(",", g.FeatureIds ?? new List<Guid>()),
                string.Join(",", g.SeriesIds ?? new List<Guid>()),
                g.CompletionStatusId.ToString(),
                string.Join(",", g.AgeRatingIds ?? new List<Guid>()),
                string.Join(",", g.RegionIds ?? new List<Guid>()),
                g.Icon ?? "",
                g.CoverImage ?? "",
                g.BackgroundImage ?? "",
                (g.Modified?.Ticks ?? 0L).ToString()
            );

            return Crypto.Sha1(payload);
        }

        /// <summary>
        /// Stable version token for "named" rows (tags, companies, sources, etc.).
        /// For now we hash Id + Name; if you later need colors or flags,
        /// extend the payload here.
        /// </summary>
        private static string ComputeNamedVersion(Guid id, string? name)
        {
            var payload = $"{id}|{name ?? ""}";
            return Crypto.Sha1(payload);
        }

        /// <summary>
        /// Helper to add a simple "id+name" collection (tags, companies, ...).
        /// </summary>
        private static void AddNamedCollection<T>(
            ClientInventory inv,
            string collection,
            IEnumerable<T> items,
            Func<T, Guid> getId,
            Func<T, string?> getName
        )
        {
            var ids = new List<string>();
            var verMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in items)
            {
                var id = getId(item).ToString();
                ids.Add(id);
                verMap[id] = ComputeNamedVersion(getId(item), getName(item));
            }

            inv.json[collection] = ids.ToArray();
            inv.versions[collection] = verMap;
        }

        /// <summary>
        /// Build client inventory from Playnite DB.
        /// </summary>
        private ClientInventory BuildClientInventory()
        {
            var m = new ClientInventory();

            // ---- games ----
            var allGames = api.Database.Games.ToList();
            m.json["games"] = allGames.Select(g => g.Id.ToString()).ToArray();

            var gameVersions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var g in allGames)
            {
                var id = g.Id.ToString();
                gameVersions[id] = ComputeGameVersion(g);
            }
            m.versions["games"] = gameVersions;

            // ---- simple named collections ----
            AddNamedCollection(m, "tags", api.Database.Tags, t => t.Id, t => t.Name);

            AddNamedCollection(m, "companies", api.Database.Companies, c => c.Id, c => c.Name);

            AddNamedCollection(m, "sources", api.Database.Sources, s => s.Id, s => s.Name);

            AddNamedCollection(m, "platforms", api.Database.Platforms, p => p.Id, p => p.Name);

            AddNamedCollection(m, "genres", api.Database.Genres, g => g.Id, g => g.Name);

            AddNamedCollection(m, "categories", api.Database.Categories, c => c.Id, c => c.Name);

            AddNamedCollection(m, "features", api.Database.Features, f => f.Id, f => f.Name);

            AddNamedCollection(m, "series", api.Database.Series, s => s.Id, s => s.Name);

            AddNamedCollection(m, "regions", api.Database.Regions, r => r.Id, r => r.Name);

            AddNamedCollection(m, "ageratings", api.Database.AgeRatings, a => a.Id, a => a.Name);

            AddNamedCollection(
                m,
                "completionstatuses",
                api.Database.CompletionStatuses,
                cs => cs.Id,
                cs => cs.Name
            );

            AddNamedCollection(
                m,
                "filterpresets",
                api.Database.FilterPresets,
                fp => fp.Id,
                fp => fp.Name
            );

            // ---- installed summary (unchanged) ----
            var installedIds = api
                .Database.Games.Where(g => g.IsInstalled)
                .Select(g => g.Id.ToString())
                .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            m.installed.count = installedIds.Length;
            m.installed.hash = string.Join("|", installedIds);

            return m;
        }

        /// <summary>
        /// Main CRUD push: build inventory, send to /delta, apply DB delta and upload media.
        /// </summary>
        private async Task PushCrudAsync()
        {
            var swTotal = Stopwatch.StartNew();
            dirtyFlag = false;

            // 0) Capture media folders that were marked dirty by earlier events
            var mediaFolders = localState.DirtyMediaFoldersSnapshot();

            blog?.Debug(
                "sync",
                "CRUD sync starting",
                new { dbDirty, mediaFolders = mediaFolders.Count }
            );

            // 1) Build snapshot BEFORE delta – may consume dirty flags to update timestamps,
            //    but we already captured the list we plan to upload.
            var snapshotBefore = localState.BuildSnapshot(fullRescan: false);

            // 2) Build client inventory and post to /delta
            var inventory = BuildClientInventory();
            var response = await PostDeltaAsync(inventory).ConfigureAwait(false);

            if (response?.ok == true && response.delta != null)
            {
                await ApplyDbDeltaAsync(response.delta).ConfigureAwait(false);
            }

            // 3) Build snapshot AFTER delta (no more dirty flags, just final state)
            var snapshotAfter = localState.BuildSnapshot(fullRescan: false);

            blog?.Debug(
                "sync",
                "Snapshot delta",
                new
                {
                    beforeDb = snapshotBefore.DbTicks,
                    afterDb = snapshotAfter.DbTicks,
                    beforeMedia = snapshotBefore.MediaVersions.Count,
                    afterMedia = snapshotAfter.MediaVersions.Count,
                    dirtyFolders = mediaFolders.Count,
                }
            );

            // 4) Upload media folders that were dirty when we started
            if (mediaFolders.Any())
            {
                await UploadMediaFoldersAsync(mediaFolders).ConfigureAwait(false);
            }

            // 5) Save snapshotAfter locally and upload it to the server snapshot endpoint
            try
            {
                // Persist locally (what you're already seeing in the log)
                snapshotStore.Save(snapshotAfter);
                blog?.Info("sync", "Snapshot saved locally.");

                // Push snapshot to server so /snapshot returns the fresh state
                var pushed = await http.UploadSnapshotAsync(syncUrl, snapshotAfter)
                    .ConfigureAwait(false);

                if (!pushed)
                {
                    blog?.Warn("sync", "Snapshot upload to server failed (see logs), continuing.");
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

            // 6) If more changes arrived while we were running, run again
            if (dirtyFlag)
            {
                blog?.Debug("sync", "More changes detected during run; scheduling another pass");
                _ = Task.Run(() => Trigger());
            }

            swTotal.Stop();
            blog?.Debug(
                "sync",
                "CRUD sync complete",
                new { totalMs = swTotal.ElapsedMilliseconds }
            );
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

                var obj = new
                {
                    MetadataVersion = ComputeGameVersion(g),

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

            if (collection.Equals("tags", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.Tags?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("companies", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.Companies?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("sources", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.Sources?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("platforms", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.Platforms?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("genres", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.Genres?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("categories", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.Categories?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("features", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.Features?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("series", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.Series?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("regions", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.Regions?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("ageratings", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.AgeRatings?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("completionstatuses", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.CompletionStatuses?.Get(gid);
                return e == null
                    ? null
                    : Playnite.SDK.Data.Serialization.ToJson(
                        new
                        {
                            MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                            e.Id,
                            e.Name,
                        }
                    );
            }

            if (collection.Equals("filterpresets", StringComparison.OrdinalIgnoreCase))
            {
                if (!Guid.TryParse(id, out var gid))
                    return null;
                var e = api.Database.FilterPresets?.Get(gid);
                if (e == null)
                    return null;

                var obj = new
                {
                    MetadataVersion = ComputeNamedVersion(e.Id, e.Name),
                    e.Id,
                    e.Name,
                    e.Settings,
                };

                return Playnite.SDK.Data.Serialization.ToJson(obj);
            }

            return null;
        }

        private static object MapNamed(Guid id, string name) => new { Id = id, Name = name };

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

                blog?.Info("sync", "Uploading media " + folder);
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
