using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Playnite.SDK;
using Playnite.SDK.Models;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Watches Playnite library and media folders for changes, and uploads deltas to a remote sync endpoint.
    /// </summary>
    internal sealed class DeltaSyncService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private readonly RemoteLogClient rlog;

        private readonly string dataRoot;
        private readonly string tempDir;
        private readonly FileSystemWatcher libWatcher;
        private readonly FileSystemWatcher mediaWatcher;

        private string syncUrl = null!;
        private volatile bool isUploading = false;
        private volatile bool dirty = false;
        private volatile bool dbDirty = false;

        private readonly object dirtyMediaLock = new object();
        private readonly HashSet<string> dirtyMediaFolders = new HashSet<string>(
            StringComparer.OrdinalIgnoreCase
        );

        private readonly Timer debounceTimer;
        private Func<bool> isHealthy = () => true;

        private readonly HttpClientEx http = new HttpClientEx();

        // New: composition
        private readonly SnapshotStore snapshot;
        private readonly LocalStateScanner scanner;

        public DeltaSyncService(
            IPlayniteAPI api,
            string syncUrl,
            string dataRoot,
            RemoteLogClient rlog
        )
        {
            this.api = api;
            this.rlog = rlog;
            this.dataRoot = dataRoot ?? "";
            this.syncUrl = (syncUrl ?? "").TrimEnd('/');

            var localApp = Environment.GetFolderPath(
                Environment.SpecialFolder.LocalApplicationData
            );
            tempDir = Path.Combine(localApp, AppConstants.TempDirName, "sync");
            Directory.CreateDirectory(tempDir);

            var myExtDataDir = Path.Combine(api.Paths.ExtensionsDataPath, AppConstants.GUID);
            //var myExtDataDir = api.Paths.PluginUserDataPath; // Doesn't work...?
            Directory.CreateDirectory(myExtDataDir);
            snapshot = new SnapshotStore(myExtDataDir);
            scanner = new LocalStateScanner(api, this.dataRoot);

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

        public void UpdateEndpoints(string newSyncUrl)
        {
            syncUrl = (newSyncUrl ?? "").TrimEnd('/');
            rlog?.Enqueue(
                RemoteLog.Build("debug", "sync", "Endpoints updated", data: new { syncUrl })
            );
        }

        public void SetHealthProvider(Func<bool> provider) => isHealthy = provider ?? (() => true);

        public void Start()
        {
            // Snapshot-based initial diff
            try
            {
                var prev = snapshot.Load();
                var cur = scanner.BuildSnapshot();

                var firstRun = (prev.DbTicks == 0 && prev.MediaVersions.Count == 0);
                if (firstRun)
                {
                    dbDirty = true;
                    lock (dirtyMediaLock)
                    {
                        foreach (var name in cur.MediaVersions.Keys)
                            dirtyMediaFolders.Add(name);
                    }
                    rlog?.Enqueue(
                        RemoteLog.Build(
                            "debug",
                            "sync",
                            "Initial seed prepared (first run)",
                            data: new { json = true, mediaFolders = cur.MediaVersions.Count }
                        )
                    );
                }
                else
                {
                    if (cur.DbTicks != prev.DbTicks)
                        dbDirty = true;

                    int changed = 0;
                    var all = new HashSet<string>(
                        prev.MediaVersions.Keys,
                        StringComparer.OrdinalIgnoreCase
                    );
                    foreach (var k in cur.MediaVersions.Keys)
                        all.Add(k);

                    lock (dirtyMediaLock)
                    {
                        foreach (var k in all)
                        {
                            prev.MediaVersions.TryGetValue(k, out var pv);
                            cur.MediaVersions.TryGetValue(k, out var cv);
                            if (pv != cv)
                            {
                                dirtyMediaFolders.Add(k);
                                changed++;
                            }
                        }
                    }

                    rlog?.Enqueue(
                        RemoteLog.Build(
                            "debug",
                            "sync",
                            "Initial diff prepared",
                            data: new { json = dbDirty, mediaChanged = changed }
                        )
                    );
                }
            }
            catch (Exception ex)
            {
                rlog?.Enqueue(
                    RemoteLog.Build("warn", "sync", "Initial snapshot diff failed", err: ex.Message)
                );
            }

            libWatcher.EnableRaisingEvents = true;
            mediaWatcher.EnableRaisingEvents = true;

            rlog?.Enqueue(
                RemoteLog.Build(
                    "info",
                    "sync",
                    "Delta sync started and watchers attached",
                    data: new
                    {
                        libraryDir = Path.Combine(dataRoot, AppConstants.LibraryDirName),
                        mediaDir = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName),
                        debounceMs = AppConstants.DebounceMs_Sync,
                    }
                )
            );

            // single kick if currently healthy
            System.Threading.Tasks.Task.Run(() =>
            {
                if (isHealthy())
                {
                    rlog?.Enqueue(
                        RemoteLog.Build(
                            "info",
                            "startup",
                            "Health became healthy → triggering push+sync"
                        )
                    );
                    Trigger();
                }
                else
                {
                    rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Skipped trigger: unhealthy"));
                }
            });
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

        // Watchers

        private void OnLibraryChanged(object s, FileSystemEventArgs e)
        {
            dbDirty = true;
            Trigger();
        }

        private void OnMediaChanged(object s, FileSystemEventArgs e)
        {
            var top = GetTopLevelMediaFolderFromPath(e.FullPath);
            if (string.IsNullOrWhiteSpace(top))
                return;
            lock (dirtyMediaLock)
                dirtyMediaFolders.Add(top);
            Trigger();
        }

        // Debounce / trigger

        public void Trigger()
        {
            if (!isHealthy())
            {
                rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Skipped trigger: unhealthy"));
                return;
            }
            dirty = true;
            debounceTimer?.Change(AppConstants.DebounceMs_Sync, Timeout.Infinite);
            rlog?.Enqueue(RemoteLog.Build("info", "sync", "Manual/auto sync trigger queued"));
        }

        private async System.Threading.Tasks.Task DebouncedAsync()
        {
            try
            {
                if (isUploading)
                    return;

                if (!dirty && !dbDirty)
                {
                    lock (dirtyMediaLock)
                    {
                        if (dirtyMediaFolders.Count == 0)
                            return;
                    }
                }

                if (!isHealthy())
                {
                    rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Abort: became unhealthy"));
                    return;
                }

                isUploading = true;
                await DoUploadIfNeededAsync().ConfigureAwait(false);
            }
            finally
            {
                isUploading = false;
            }
        }

        // Upload pipeline

        private async System.Threading.Tasks.Task DoUploadIfNeededAsync()
        {
            var swTotal = System.Diagnostics.Stopwatch.StartNew();

            try
            {
                bool needJson = dbDirty;
                List<string> mediaFolders;
                lock (dirtyMediaLock)
                    mediaFolders = dirtyMediaFolders.ToList();

                if (!needJson && mediaFolders.Count == 0)
                {
                    rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Up-to-date; no upload needed"));
                    return;
                }

                var local = scanner.BuildLocalManifestView();

                Directory.CreateDirectory(tempDir);
                CleanupTempOld(60);

                foreach (var f in Directory.EnumerateFiles(tempDir, "*.zip"))
                {
                    try
                    {
                        File.Delete(f);
                    }
                    catch { }
                }

                var zipPath = Path.Combine(
                    tempDir,
                    $"{AppConstants.ZipNamePrefix}{DateTime.UtcNow.ToString(AppConstants.ZipTimestampFormat)}{AppConstants.ZipExtension}"
                );

                var swZip = System.Diagnostics.Stopwatch.StartNew();
                using (var zb = new ZipBuilder(zipPath))
                {
                    // /export/manifest.json
                    var manifestObj = new
                    {
                        json = local.Json.ToDictionary(
                            k => k.Key,
                            v => new { size = v.Value.size, mtimeMs = v.Value.mtimeMs },
                            StringComparer.OrdinalIgnoreCase
                        ),
                        mediaFolders = local
                            .MediaFolders.OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
                            .ToArray(),
                        installed = new
                        {
                            count = local.Installed.count,
                            hash = local.Installed.hash,
                        },
                    };
                    zb.AddText(
                        AppConstants.ManifestPathInZip,
                        Playnite.SDK.Data.Serialization.ToJson(manifestObj)
                    );

                    // JSON snapshot if DB changed
                    if (needJson)
                        ExportSdkSnapshotToZip(zb);

                    // Media folders that changed
                    foreach (var folder in mediaFolders)
                        AddMediaFolderRecursively(zb, folder);
                }
                swZip.Stop();

                rlog?.Enqueue(
                    RemoteLog.Build(
                        "info",
                        "sync",
                        "Uploading delta",
                        data: new
                        {
                            needJson,
                            mediaFolders = mediaFolders.Count,
                            zipMs = swZip.ElapsedMilliseconds,
                            zipPath,
                        }
                    )
                );

                // upload
                var swUpload = System.Diagnostics.Stopwatch.StartNew();
                var ok = await http.SyncZipAsync(syncUrl, zipPath).ConfigureAwait(false);
                swUpload.Stop();
                if (!ok)
                    throw new Exception("sync endpoint returned non-OK");

                // success → clear flags
                dbDirty = false;
                lock (dirtyMediaLock)
                    dirtyMediaFolders.Clear();

                rlog?.Enqueue(
                    RemoteLog.Build(
                        "info",
                        "sync",
                        "Upload complete",
                        data: new
                        {
                            json = needJson,
                            mediaFolders,
                            uploadMs = swUpload.ElapsedMilliseconds,
                            totalMs = swTotal.ElapsedMilliseconds,
                        }
                    )
                );

                // persist new snapshot
                try
                {
                    snapshot.Save(scanner.BuildSnapshot());
                    rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Saved lastManifest snapshot"));
                }
                catch (Exception ex)
                {
                    rlog?.Enqueue(
                        RemoteLog.Build("warn", "sync", "Failed to save snapshot", err: ex.Message)
                    );
                }

                // if more dirt gathered during upload → schedule again
                if (dirty)
                {
                    dirty = false;
                    rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Processing dirty re-run"));
                    Trigger();
                }
            }
            catch (Exception ex)
            {
                rlog?.Enqueue(
                    RemoteLog.Build(
                        "error",
                        "sync",
                        "Upload failed",
                        err: ex.Message,
                        data: new { totalMs = swTotal.ElapsedMilliseconds }
                    )
                );

                api?.Notifications?.Add(
                    AppConstants.Notif_Sync_Error,
                    "Delta Sync upload failed",
                    NotificationType.Error
                );
            }
        }

        // Helpers

        private static string GetRelativePath(string baseDir, string fullPath)
        {
            if (string.IsNullOrEmpty(baseDir))
                return fullPath;
            var baseUri = new Uri(AppendSep(baseDir));
            var pathUri = new Uri(fullPath);
            var rel = baseUri.MakeRelativeUri(pathUri).ToString();
            return Uri.UnescapeDataString(rel).Replace('/', Path.DirectorySeparatorChar);

            static string AppendSep(string p) =>
                p.EndsWith(Path.DirectorySeparatorChar.ToString())
                    ? p
                    : p + Path.DirectorySeparatorChar;
        }

        private string GetTopLevelMediaFolderFromPath(string fullPath)
        {
            if (string.IsNullOrWhiteSpace(fullPath))
                return null;

            var mediaRoot = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName);
            mediaRoot = mediaRoot.EndsWith(Path.DirectorySeparatorChar.ToString())
                ? mediaRoot
                : mediaRoot + Path.DirectorySeparatorChar;

            if (!fullPath.StartsWith(mediaRoot, StringComparison.OrdinalIgnoreCase))
                return null;

            var rel = fullPath.Substring(mediaRoot.Length).TrimStart(Path.DirectorySeparatorChar);
            var first = rel.Split(new[] { Path.DirectorySeparatorChar }, 2, StringSplitOptions.None)
                .FirstOrDefault();
            return string.IsNullOrWhiteSpace(first) ? null : first;
        }

        private void CleanupTempOld(int maxAgeMinutes)
        {
            try
            {
                foreach (var f in Directory.EnumerateFiles(tempDir, "*.zip"))
                {
                    try
                    {
                        var fi = new FileInfo(f);
                        if (fi.CreationTimeUtc < DateTime.UtcNow.AddMinutes(-maxAgeMinutes))
                            File.Delete(f);
                    }
                    catch { }
                }
            }
            catch { }
        }

        private void AddMediaFolderRecursively(ZipBuilder zb, string topLevelFolder)
        {
            var mediaRoot = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName);
            var folderAbs = Path.Combine(mediaRoot, topLevelFolder);
            if (!Directory.Exists(folderAbs))
                return;

            foreach (
                var path in Directory.EnumerateFiles(folderAbs, "*", SearchOption.AllDirectories)
            )
            {
                var rel = GetRelativePath(folderAbs, path);
                var relInZip = Path.Combine(AppConstants.ZipFilesDirName, topLevelFolder, rel)
                    .Replace('\\', '/');
                zb.AddFile(path, relInZip, CompressionLevel.Optimal);
            }
        }

        private void ExportSdkSnapshotToZip(ZipBuilder zb)
        {
            // meta
            zb.AddText(
                AppConstants.MetaPathInZip,
                Playnite.SDK.Data.Serialization.ToJson(
                    new
                    {
                        exportedAt = DateTime.UtcNow.ToString("o"),
                        exporter = AppConstants.AppName,
                    }
                )
            );

            // helpers
            object MapNamed<T>(T x)
            {
                dynamic d = x;
                return new { Id = d.Id, Name = d.Name };
            }

            // --- GAMES (ids for joins; PlatformIds supported in Playnite 10)
            var games =
                api.Database.Games?.Select(g =>
                        (object)
                            new
                            {
                                g.Id,
                                g.Name,
                                g.SortingName,
                                g.Hidden,
                                g.InstallDirectory,

                                // join ids
                                SourceId = g.SourceId,
                                TagIds = (g.TagIds ?? new List<Guid>()).ToList(),
                                PlatformIds = (g.PlatformIds ?? new List<Guid>()).ToList(),
                                PrimaryPlatformId = (
                                    g.PlatformIds != null && g.PlatformIds.Count > 0
                                )
                                    ? (Guid?)g.PlatformIds[0]
                                    : null,

                                // dates + art
                                g.ReleaseDate,
                                ReleaseYear = (int?)g.ReleaseDate?.Year,
                                g.Icon,
                                g.CoverImage,
                                g.BackgroundImage,

                                // links
                                g.Links,
                            }
                    )
                    .ToList() ?? new List<object>();

            zb.AddText(
                AppConstants.GamesJsonPathInZip,
                Playnite.SDK.Data.Serialization.ToJson(games)
            );

            // --- Recipes: existing first, then the rest
            var recipes = new (IEnumerable<object> Data, string Path)[]
            {
                // Existing
                (
                    api.Database.Tags?.Select(t => MapNamed(t)).Cast<object>()
                        ?? Array.Empty<object>(),
                    AppConstants.TagsJsonPathInZip
                ),
                (
                    api.Database.Sources?.Select(s => MapNamed(s)).Cast<object>()
                        ?? Array.Empty<object>(),
                    AppConstants.SourcesJsonPathInZip
                ),
                // New (supported in Playnite 10)
                (
                    api.Database.Platforms?.Select(p =>
                        (object)
                            new
                            {
                                p.Id,
                                p.Name,
                                p.Icon,
                            }
                    ) ?? Array.Empty<object>(),
                    AppConstants.PlatformsJsonPathInZip
                ),
                (
                    api.Database.Genres?.Select(MapNamed).Cast<object>() ?? Array.Empty<object>(),
                    AppConstants.GenresJsonPathInZip
                ),
                (
                    api.Database.Categories?.Select(MapNamed).Cast<object>()
                        ?? Array.Empty<object>(),
                    AppConstants.CategoriesJsonPathInZip
                ),
                (
                    api.Database.Features?.Select(MapNamed).Cast<object>() ?? Array.Empty<object>(),
                    AppConstants.FeaturesJsonPathInZip
                ),
                (
                    api.Database.Series?.Select(MapNamed).Cast<object>() ?? Array.Empty<object>(),
                    AppConstants.SeriesJsonPathInZip
                ),
                (
                    api.Database.Regions?.Select(MapNamed).Cast<object>() ?? Array.Empty<object>(),
                    AppConstants.RegionsJsonPathInZip
                ),
                (
                    api.Database.AgeRatings?.Select(MapNamed).Cast<object>()
                        ?? Array.Empty<object>(),
                    AppConstants.AgeRatingsJsonPathInZip
                ),
                (
                    api.Database.Emulators?.Select(MapNamed).Cast<object>()
                        ?? Array.Empty<object>(),
                    AppConstants.EmulatorsJsonPathInZip
                ),
                (
                    api.Database.CompletionStatuses?.Select(MapNamed).Cast<object>()
                        ?? Array.Empty<object>(),
                    AppConstants.CompletionStatusesJsonPathInZip
                ),
                (
                    api.Database.FilterPresets?.Select(MapNamed).Cast<object>()
                        ?? Array.Empty<object>(),
                    AppConstants.FilterPresetsJsonPathInZip
                ),
                (
                    api.Database.ImportExclusions?.Select(MapNamed).Cast<object>()
                        ?? Array.Empty<object>(),
                    AppConstants.ImportExclusionsJsonPathInZip
                ),

                // NOTE: Scanners/Tools removed: not present on IGameDatabaseAPI in this SDK
            };

            foreach (var (data, path) in recipes)
            {
                var list = data?.ToList() ?? new List<object>();
                zb.AddText(path, Playnite.SDK.Data.Serialization.ToJson(list)); // always emit, even if empty
            }
        }
    }
}
