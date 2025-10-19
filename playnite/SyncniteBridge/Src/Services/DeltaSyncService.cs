using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Orchestrates watchers, planning, zipping and uploading deltas.
    /// </summary>
    internal sealed class DeltaSyncService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private readonly BridgeLogger? blog;
        private readonly string dataRoot;
        private readonly string tempDir;
        private readonly FileSystemWatcher libWatcher;
        private readonly FileSystemWatcher mediaWatcher;
        private readonly Timer debounceTimer;

        private string syncUrl = null!;
        private volatile bool isUploading = false;
        private volatile bool dirtyFlag = false;
        private volatile bool dbDirty = false;

        private Func<bool> isHealthy = () => true;

        private readonly HttpClientEx http;
        private readonly StoreSnapshotService snapshot;
        private readonly LocalStateScanService scanner;
        private readonly MediaChangeService mediaChanges = new MediaChangeService();
        private readonly DeltaSyncPlanService planner;
        private readonly ZipAssemblyService zipper;

        public DeltaSyncService(
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

            var localApp = Environment.GetFolderPath(
                Environment.SpecialFolder.LocalApplicationData
            );
            tempDir = Path.Combine(localApp, AppConstants.TempDirName, "sync");
            Directory.CreateDirectory(tempDir);

            var myExtDataDir = Path.Combine(api.Paths.ExtensionsDataPath, AppConstants.GUID);
            Directory.CreateDirectory(myExtDataDir);
            snapshot = new StoreSnapshotService(myExtDataDir, blog);
            scanner = new LocalStateScanService(api, this.dataRoot, blog);
            planner = new DeltaSyncPlanService(scanner, this.dataRoot, blog);
            zipper = new ZipAssemblyService(
                this.dataRoot,
                tempDir,
                new SdkSnapshotService(api),
                blog
            );

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
        /// Update sync endpoints.
        /// </summary>
        public void UpdateEndpoints(string newSyncUrl)
        {
            syncUrl = (newSyncUrl ?? "").TrimEnd('/');
            blog?.Debug("sync", "Endpoints updated", new { syncUrl });
        }

        /// <summary>
        /// Set health provider function.
        /// </summary>
        public void SetHealthProvider(Func<bool> provider) => isHealthy = provider ?? (() => true);

        /// <summary>
        /// Start delta sync service.
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

                    var all = new HashSet<string>(
                        prev.MediaVersions.Keys,
                        StringComparer.OrdinalIgnoreCase
                    );
                    foreach (var k in cur.MediaVersions.Keys)
                        all.Add(k);
                    int changed = 0;
                    foreach (var k in all)
                    {
                        prev.MediaVersions.TryGetValue(k, out var pv);
                        cur.MediaVersions.TryGetValue(k, out var cv);
                        if (pv != cv)
                        {
                            mediaChanges.Add(k);
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

        /// <summary>
        /// Handle library changes.
        /// </summary>
        private void OnLibraryChanged(object s, FileSystemEventArgs e)
        {
            dbDirty = true;
            Trigger();
        }

        /// <summary>
        /// Handle media changes.
        /// </summary>
        private void OnMediaChanged(object s, FileSystemEventArgs e)
        {
            var top = PathHelpers.GetTopLevelMediaFolderFromPath(dataRoot, e.FullPath);
            if (!string.IsNullOrWhiteSpace(top))
                mediaChanges.Add(top!);
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
            blog?.Info("sync", "Manual/auto sync trigger queued");
        }

        /// <summary>
        /// Debounced upload task.
        /// </summary>
        private async System.Threading.Tasks.Task DebouncedAsync()
        {
            try
            {
                if (isUploading)
                    return;
                if (!dirtyFlag && !dbDirty && mediaChanges.Count == 0)
                    return;
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
        /// Perform upload if there are pending changes.
        /// </summary>
        private async System.Threading.Tasks.Task DoUploadIfNeededAsync()
        {
            var swTotal = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                var mediaFolders = mediaChanges.Snapshot();
                if (!dbDirty && mediaFolders.Count == 0)
                {
                    blog?.Debug("sync", "Up-to-date; no upload needed");
                    return;
                }

                var plan = planner.Build(dbDirty, mediaFolders);
                var expected = planner.EstimateZipBytes(plan);
                var zipPath = zipper.Assemble(plan, expected);

                blog?.Info("sync", "Uploading delta");
                blog?.Debug(
                    "sync",
                    "Upload details",
                    new { mediaFolders = plan.MediaFolders.Count, zipPath }
                );

                var swUpload = System.Diagnostics.Stopwatch.StartNew();
                var ok = await http.SyncZipAsync(syncUrl, zipPath).ConfigureAwait(false);
                swUpload.Stop();
                if (!ok)
                    throw new Exception("sync endpoint returned non-OK");

                dbDirty = false;
                mediaChanges.Clear();

                blog?.Info("sync", "Upload complete");
                blog?.Debug(
                    "sync",
                    "Upload stats",
                    new
                    {
                        mediaFolders = plan.MediaFolders,
                        uploadMs = swUpload.ElapsedMilliseconds,
                        totalMs = swTotal.ElapsedMilliseconds,
                    }
                );

                try
                {
                    snapshot.Save(scanner.BuildSnapshot());
                    blog?.Debug("sync", "Saved lastManifest snapshot");
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
    }
}
