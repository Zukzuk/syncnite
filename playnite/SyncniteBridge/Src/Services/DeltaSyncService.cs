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
    /// Watches Playnite library and media folders for changes,
    /// and uploads deltas to a remote sync endpoint.
    /// </summary>
    internal sealed class DeltaSyncService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private readonly BridgeLogger blog;

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

        private readonly HttpClientEx http;

        // New: composition
        private readonly SnapshotStore snapshot;
        private readonly LocalStateScanner scanner;

        /// <summary>
        /// Create delta sync service.
        /// </summary>
        public DeltaSyncService(
            IPlayniteAPI api,
            string syncUrl,
            string dataRoot,
            BridgeLogger blog
        )
        {
            this.api = api;
            this.blog = blog;
            this.dataRoot = dataRoot ?? "";
            this.syncUrl = (syncUrl ?? "").TrimEnd('/');

            http = new HttpClientEx(blog);

            var localApp = Environment.GetFolderPath(
                Environment.SpecialFolder.LocalApplicationData
            );
            tempDir = Path.Combine(localApp, AppConstants.TempDirName, "sync");
            Directory.CreateDirectory(tempDir);

            var myExtDataDir = Path.Combine(api.Paths.ExtensionsDataPath, AppConstants.GUID);
            Directory.CreateDirectory(myExtDataDir);
            snapshot = new SnapshotStore(myExtDataDir);
            scanner = new LocalStateScanner(api, this.dataRoot, blog);

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
            blog?.Debug("sync", "Endpoints updated", new { syncUrl });
        }

        public void SetHealthProvider(Func<bool> provider) => isHealthy = provider ?? (() => true);

        /// <summary>
        /// Start watching and syncing.
        /// </summary>
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
                    // Milestone: first run detected → INFO
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

            // Milestone: service ready
            blog?.Info("sync", "Delta sync started and watchers attached");
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

            // single kick if currently healthy
            System.Threading.Tasks.Task.Run(() =>
            {
                if (isHealthy())
                {
                    blog?.Info("startup", "Health became healthy → triggering push+sync");
                    Trigger();
                }
                else
                {
                    blog?.Debug("sync", "Skipped trigger: unhealthy");
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
                blog?.Debug("sync", "Skipped trigger: unhealthy");
                return;
            }
            dirty = true;
            debounceTimer?.Change(AppConstants.DebounceMs_Sync, Timeout.Infinite);
            // Milestone: a sync pass has been queued
            blog?.Info("sync", "Manual/auto sync trigger queued");
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
                    blog?.Debug("sync", "Abort: became unhealthy");
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

        /// <summary>
        /// Perform upload if there are changes.
        /// </summary>
        private async System.Threading.Tasks.Task DoUploadIfNeededAsync()
        {
            var swTotal = System.Diagnostics.Stopwatch.StartNew();

            try
            {
                List<string> mediaFolders;
                lock (dirtyMediaLock)
                    mediaFolders = dirtyMediaFolders.ToList();

                if (!dbDirty && mediaFolders.Count == 0)
                {
                    blog?.Debug("sync", "Up-to-date; no upload needed");
                    return;
                }

                // Milestone: preparing plan (what will be uploaded)
                blog?.Info("sync", "Preparing upload plan");
                blog?.Debug(
                    "sync",
                    "Upload plan details",
                    new { dbChanged = dbDirty, mediaFoldersChanged = mediaFolders.Count }
                );

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

                // Milestone: assembling ZIP (before work starts)
                blog?.Info("sync", "Assembling ZIP");
                blog?.Debug(
                    "sync",
                    "ZIP details",
                    new { mediaFolders = mediaFolders.Count, temp = zipPath }
                );

                // Build manifest object up-front so we can estimate size
                var manifestObj = new
                {
                    json = local
                        .Json.OrderBy(kv => kv.Key, StringComparer.OrdinalIgnoreCase)
                        .ToDictionary(
                            kv => kv.Key,
                            kv => new { size = kv.Value.size, mtimeMs = kv.Value.mtimeMs },
                            StringComparer.OrdinalIgnoreCase
                        ),
                    mediaFolders = local
                        .MediaFolders.OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
                        .ToArray(),
                    installed = new { count = local.Installed.count, hash = local.Installed.hash },
                };

                // Serialize manifest now for estimator
                var manifestJson = Playnite.SDK.Data.Serialization.ToJson(manifestObj);

                // Estimate total work for zipping (only the content we’ll actually add)
                long mediaBytes = 0;
                foreach (var folder in mediaFolders)
                {
                    var abs = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName, folder);
                    try
                    {
                        mediaBytes += ZipSizeEstimator.ForFilesUnder(abs);
                    }
                    catch { }
                }

                // Also include rough cost for DB files (small).
                long dbBytes = ZipSizeEstimator.ForFilesUnder(
                    Path.Combine(dataRoot, AppConstants.LibraryDirName)
                );
                long totalZipBytes = ZipSizeEstimator.ForText(manifestJson) + dbBytes + mediaBytes;

                var swZip = System.Diagnostics.Stopwatch.StartNew();
                var zipBuckets = new PercentBuckets(step: 10);
                blog?.Info("sync", "zipping start");
                using (
                    var zb = new ZipBuilder(
                        zipPath,
                        blog,
                        expectedTotalBytes: totalZipBytes,
                        onPercent: pct =>
                        {
                            if (zipBuckets.ShouldEmit(pct, out var b))
                            {
                                blog?.Info("progress", "zipping");
                                blog?.Debug(
                                    "progress",
                                    "zipping",
                                    new { phase = "zip", percent = b }
                                );
                            }
                        }
                    )
                )
                {
                    // /export/manifest.json
                    zb.AddText(AppConstants.ManifestPathInZip, manifestJson);

                    // Always include DB files under /library/*.db (server will dump to JSON)
                    AddDbFiles(zb);

                    // Media folders that changed
                    foreach (var folder in mediaFolders)
                    {
                        blog?.Debug("sync", $"Include media folder: {folder}");
                        AddMediaFolderRecursively(zb, folder);
                    }
                }
                swZip.Stop();

                // Milestone: uploading
                blog?.Info("sync", "Uploading delta");
                blog?.Debug(
                    "sync",
                    "Upload details",
                    new
                    {
                        mediaFolders = mediaFolders.Count,
                        zipMs = swZip.ElapsedMilliseconds,
                        zipPath,
                    }
                );

                // upload (sparse % handled in HttpClientEx)
                var swUpload = System.Diagnostics.Stopwatch.StartNew();
                var ok = await http.SyncZipAsync(syncUrl, zipPath).ConfigureAwait(false);
                swUpload.Stop();
                if (!ok)
                    throw new Exception("sync endpoint returned non-OK");

                // success → clear flags
                dbDirty = false;
                lock (dirtyMediaLock)
                    dirtyMediaFolders.Clear();

                blog?.Info("sync", "Upload complete");
                blog?.Debug(
                    "sync",
                    "Upload stats",
                    new
                    {
                        mediaFolders,
                        uploadMs = swUpload.ElapsedMilliseconds,
                        totalMs = swTotal.ElapsedMilliseconds,
                    }
                );

                // persist new snapshot
                try
                {
                    snapshot.Save(scanner.BuildSnapshot());
                    blog?.Debug("sync", "Saved lastManifest snapshot");
                }
                catch (Exception ex)
                {
                    blog?.Warn("sync", "Failed to save snapshot", new { err = ex.Message });
                }

                // if more dirt gathered during upload → schedule again
                if (dirty)
                {
                    dirty = false;
                    blog?.Debug("sync", "Processing dirty re-run");
                    Trigger();
                }
            }
            catch (Exception ex)
            {
                blog?.Error(
                    "sync",
                    "Upload failed",
                    data: new { totalMs = swTotal.ElapsedMilliseconds },
                    err: ex.Message
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

        private string? GetTopLevelMediaFolderFromPath(string fullPath)
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

        // Add library/*.db into the ZIP so the server can transform them
        private void AddDbFiles(ZipBuilder zb)
        {
            var libDir = Path.Combine(dataRoot, AppConstants.LibraryDirName);
            if (!Directory.Exists(libDir))
                return;

            foreach (
                var path in Directory
                    .EnumerateFiles(libDir, "*.db", SearchOption.TopDirectoryOnly)
                    .OrderBy(p => p, StringComparer.OrdinalIgnoreCase)
            )
            {
                try
                {
                    var name = Path.GetFileName(path);
                    var relInZip = Path.Combine(AppConstants.LibraryDirName, name)
                        .Replace('\\', '/');
                    zb.AddFile(path, relInZip, CompressionLevel.Fastest);
                    blog?.Debug("zip", "include db", new { name });
                }
                catch (Exception ex)
                {
                    blog?.Warn("zip", "skip db", new { path, err = ex.Message });
                }
            }
        }

        private void AddMediaFolderRecursively(ZipBuilder zb, string topLevelFolder)
        {
            var mediaRoot = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName);
            var folderAbs = Path.Combine(mediaRoot, topLevelFolder);
            if (!Directory.Exists(folderAbs))
                return;

            foreach (
                var path in Directory
                    .EnumerateFiles(folderAbs, "*", SearchOption.AllDirectories)
                    .OrderBy(p => p, StringComparer.OrdinalIgnoreCase)
            )
            {
                var rel = GetRelativePath(folderAbs, path);
                var relInZip = Path.Combine(AppConstants.ZipFilesDirName, topLevelFolder, rel)
                    .Replace('\\', '/');
                try
                {
                    zb.AddFile(path, relInZip, CompressionLevel.Optimal);
                }
                catch (Exception ex)
                {
                    blog?.Warn("zip", "skip file", new { path, err = ex.Message });
                }
            }
        }
    }
}
