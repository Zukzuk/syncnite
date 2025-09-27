using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using Playnite.SDK;
using PlayniteViewerBridge.Constants;
using PlayniteViewerBridge.Helpers;

namespace PlayniteViewerBridge.LiveSync
{
    internal sealed class LiveDeltaSyncService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private readonly ILogger log = LogManager.GetLogger();
        private readonly RemoteLogClient rlog;

        private string syncUrl;
        private string indexUrl;
        private readonly string dataRoot;

        private readonly HttpClientEx http;
        private readonly System.Timers.Timer debounce;

        private volatile bool pending;
        private volatile bool isUploading;
        private volatile bool dirty;
        private volatile bool libraryDirty; // set when *.db changed

        private FileSystemWatcher libWatcher;
        private FileSystemWatcher mediaWatcher;

        private readonly string tempDir;

        private Func<bool> isHealthy = () => true; // injected

        public LiveDeltaSyncService(
            IPlayniteAPI api,
            string syncUrl,
            string dataRoot,
            RemoteLogClient rlog = null
        )
        {
            this.api = api;
            this.syncUrl = syncUrl?.Trim();
            this.dataRoot = dataRoot?.Trim();
            this.rlog = rlog;

            http = new HttpClientEx();

            debounce = new System.Timers.Timer(AppConstants.DebounceMs_LiveSync)
            {
                AutoReset = false,
            };
            debounce.Elapsed += async (s, e) => await OnDebouncedAsync().ConfigureAwait(false);

            tempDir = Path.Combine(Path.GetTempPath(), AppConstants.TempDirName, "sync");
            Directory.CreateDirectory(tempDir);
        }

        public void SetHealthProvider(Func<bool> provider) => isHealthy = provider ?? (() => true);

        public void UpdateEndpoints(string newSync, string newIndex)
        {
            syncUrl = newSync?.Trim();
            indexUrl = newIndex?.Trim();
            rlog?.Enqueue(
                RemoteLog.Build(
                    "debug",
                    "sync",
                    "Endpoints updated",
                    data: new { syncUrl, indexUrl }
                )
            );
        }

        public void Start()
        {
            if (string.IsNullOrWhiteSpace(dataRoot) || !Directory.Exists(dataRoot))
            {
                api.Dialogs.ShowMessage("ViewerBridge Live Sync: Playnite data folder not found.");
                rlog?.Enqueue(
                    RemoteLog.Build(
                        "error",
                        "sync",
                        "Playnite data folder not found",
                        data: new { dataRoot }
                    )
                );
                return;
            }

            var libraryDir = Path.Combine(dataRoot, AppConstants.LibraryDirName);
            var mediaDir = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName);
            if (!Directory.Exists(libraryDir) || !Directory.Exists(mediaDir))
            {
                api.Dialogs.ShowMessage(
                    "ViewerBridge Live Sync: expected 'library' and 'libraryfiles' under Playnite data root."
                );
                rlog?.Enqueue(
                    RemoteLog.Build(
                        "error",
                        "sync",
                        "Expected library & libraryfiles missing",
                        data: new { libraryDir, mediaDir }
                    )
                );
                return;
            }

            libWatcher = MakeWatcher(libraryDir, "*.db", includeSubdirs: false);
            mediaWatcher = MakeWatcher(mediaDir, "*", includeSubdirs: true);
            rlog?.Enqueue(
                RemoteLog.Build(
                    "info",
                    "sync",
                    "Live sync started and watchers attached",
                    data: new
                    {
                        libraryDir,
                        mediaDir,
                        debounceMs = AppConstants.DebounceMs_LiveSync,
                    }
                )
            );

            CleanupTempOld();
            // Do not auto-trigger; PlayniteViewerBridge will trigger on health=healthy
        }

        private FileSystemWatcher MakeWatcher(string path, string filter, bool includeSubdirs)
        {
            var w = new FileSystemWatcher(path, filter)
            {
                IncludeSubdirectories = includeSubdirs,
                EnableRaisingEvents = true,
                InternalBufferSize = 64 * 1024,
                NotifyFilter =
                    NotifyFilters.LastWrite
                    | NotifyFilters.FileName
                    | NotifyFilters.DirectoryName
                    | NotifyFilters.Size,
            };
            w.Changed += OnFsEvent;
            w.Created += OnFsEvent;
            w.Deleted += OnFsEvent;
            w.Renamed += OnFsEvent;
            w.Error += (s, e) =>
            {
                rlog?.Enqueue(
                    RemoteLog.Build(
                        "warn",
                        "sync",
                        "FS watcher error (buffer overflow?)",
                        err: e.GetException()?.Message
                    )
                );
                try
                {
                    w.EnableRaisingEvents = false;
                }
                catch { }
                try
                {
                    w.EnableRaisingEvents = true;
                }
                catch { }
                Trigger();
            };
            return w;
        }

        private void OnFsEvent(object sender, FileSystemEventArgs e)
        {
            pending = true;
            if (
                e?.FullPath != null
                && e.FullPath.EndsWith(".db", StringComparison.OrdinalIgnoreCase)
            )
                libraryDirty = true;
            try
            {
                debounce.Stop();
            }
            catch { }
            try
            {
                debounce.Start();
            }
            catch { }
            rlog?.Enqueue(
                RemoteLog.Build(
                    "debug",
                    "sync",
                    "FS event debounced",
                    data: new { e.ChangeType, e.FullPath }
                )
            );
        }

        public void Trigger()
        {
            if (!isHealthy())
            {
                rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Skipped trigger: unhealthy"));
                pending = true; // keep pending so a flip-to-healthy can process
                return;
            }
            pending = true;
            try
            {
                debounce.Stop();
            }
            catch { }
            try
            {
                debounce.Start();
            }
            catch { }
            rlog?.Enqueue(RemoteLog.Build("info", "sync", "Manual/auto sync trigger queued"));
        }

        private async Task OnDebouncedAsync()
        {
            if (!pending)
                return;
            if (!isHealthy())
            {
                rlog?.Enqueue(
                    RemoteLog.Build("debug", "sync", "Abort run: unhealthy; keeping pending")
                );
                return;
            }

            pending = false;

            if (isUploading)
            {
                dirty = true;
                rlog?.Enqueue(
                    RemoteLog.Build(
                        "debug",
                        "sync",
                        "Upload in progress; marked dirty for another run"
                    )
                );
                return;
            }

            await DoUploadAsync().ConfigureAwait(false);

            if (dirty)
            {
                dirty = false;
                rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Processing dirty re-run"));
                await DoUploadAsync().ConfigureAwait(false);
            }
        }

        private struct RemoteEntry
        {
            public long Size;
            public long MTimeMs;

            public RemoteEntry(long size, long mtimeMs)
            {
                Size = size;
                MTimeMs = mtimeMs;
            }
        }

        private sealed class LocalFile
        {
            public string Abs { get; set; }
            public string RelDisk { get; set; } // e.g., "library/files/..."
            public string RelZip { get; set; } // e.g., "libraryfiles/..."
            public long Size { get; set; }
            public long MTimeMs { get; set; }
        }

        private async Task DoUploadAsync()
        {
            isUploading = true;
            var swTotal = Stopwatch.StartNew();

            try
            {
                if (string.IsNullOrWhiteSpace(syncUrl))
                {
                    rlog?.Enqueue(
                        RemoteLog.Build(
                            "error",
                            "sync",
                            "Upload aborted: missing sync endpoint",
                            data: new { syncUrl, indexUrl }
                        )
                    );
                    return;
                }

                // 1) Local media index
                var swLocal = Stopwatch.StartNew();
                var localMedia = ListLocalMediaFiles();
                swLocal.Stop();

                // 2) Remote index (empty list on first run)
                var swRemote = Stopwatch.StartNew();
                var remote = !string.IsNullOrWhiteSpace(indexUrl)
                    ? await http.GetRemoteIndexAsync(indexUrl).ConfigureAwait(false)
                    : null;
                swRemote.Stop();

                var remoteIndex = new Dictionary<string, RemoteEntry>(
                    StringComparer.OrdinalIgnoreCase
                );
                if (remote?.files != null)
                {
                    foreach (var f in remote.files)
                    {
                        var rp = (f.rel ?? "").Replace('\\', '/');
                        remoteIndex[rp] = new RemoteEntry(f.size, f.mtimeMs);
                    }
                }

                // Does server already have the main SDK JSON?
                bool remoteHasSdkJson =
                    remote != null
                    && remote.files != null
                    && remote.files.Any(f =>
                        string.Equals(f.rel, "games.Game.json", StringComparison.OrdinalIgnoreCase)
                    );

                // 3) Compute delta (media)
                var changed = new List<LocalFile>();
                long changedBytes = 0;
                foreach (var lf in localMedia)
                {
                    var relZip = MapToZipPath(lf.RelDisk); // -> libraryfiles/...
                    var key = relZip.Replace('\\', '/');

                    RemoteEntry r;
                    if (remoteIndex.TryGetValue(key, out r))
                    {
                        if (r.Size == lf.Size && r.MTimeMs == lf.MTimeMs)
                            continue; // identical
                    }

                    changed.Add(
                        new LocalFile
                        {
                            Abs = lf.Abs,
                            RelDisk = lf.RelDisk,
                            RelZip = key,
                            Size = lf.Size,
                            MTimeMs = lf.MTimeMs,
                        }
                    );
                    checked
                    {
                        changedBytes += lf.Size;
                    }
                }

                // If no media changed, decide whether to seed JSON anyway
                if (changed.Count == 0)
                {
                    if (!libraryDirty && !remoteHasSdkJson)
                    {
                        // Seed JSON-only on brand-new server (no games.Game.json yet)
                        string seedZip = null;
                        try
                        {
                            seedZip = Path.Combine(
                                tempDir,
                                $"delta_{DateTime.UtcNow:yyyyMMdd_HHmmssfff}_jsononly.zip"
                            );
                            var swZip = Stopwatch.StartNew();
                            using (var zb = new ZipBuilder(seedZip))
                            {
                                ExportSdkSnapshotToZip(zb);
                            }
                            swZip.Stop();

                            rlog?.Enqueue(
                                RemoteLog.Build(
                                    "info",
                                    "sync",
                                    "Uploading JSON-only seed",
                                    data: new
                                    {
                                        zipMs = swZip.ElapsedMilliseconds,
                                        zipPath = seedZip,
                                    }
                                )
                            );

                            var swUpload = Stopwatch.StartNew();
                            var ok = await http.SyncZipAsync(syncUrl, seedZip)
                                .ConfigureAwait(false);
                            swUpload.Stop();
                            if (!ok)
                                throw new Exception("sync endpoint returned non-OK");

                            rlog?.Enqueue(
                                RemoteLog.Build(
                                    "info",
                                    "sync",
                                    "JSON seed complete",
                                    data: new
                                    {
                                        uploadMs = swUpload.ElapsedMilliseconds,
                                        totalMs = swTotal.ElapsedMilliseconds,
                                    }
                                )
                            );
                        }
                        finally
                        {
                            try
                            {
                                if (!string.IsNullOrEmpty(seedZip) && File.Exists(seedZip))
                                    File.Delete(seedZip);
                            }
                            catch { }
                        }
                        return;
                    }

                    if (!libraryDirty)
                    {
                        rlog?.Enqueue(
                            RemoteLog.Build(
                                "debug",
                                "sync",
                                "No media changes; skipping upload",
                                data: new
                                {
                                    elapsedMs_local = swLocal.ElapsedMilliseconds,
                                    elapsedMs_remote = swRemote.ElapsedMilliseconds,
                                }
                            )
                        );
                        return;
                    }

                    // libraryDirty == true → continue to build a JSON-only zip below
                }

                // 4) Build one ZIP on disk (always include SDK JSON on any upload)
                string zipPath = null;
                try
                {
                    zipPath = Path.Combine(
                        tempDir,
                        $"delta_{DateTime.UtcNow:yyyyMMdd_HHmmssfff}.zip"
                    );
                    var swZip = Stopwatch.StartNew();
                    using (var zb = new ZipBuilder(zipPath))
                    {
                        ExportSdkSnapshotToZip(zb); // shaped filenames
                        foreach (var f in changed)
                        {
                            zb.AddFile(f.Abs, f.RelZip);
                        }
                    }
                    swZip.Stop();

                    rlog?.Enqueue(
                        RemoteLog.Build(
                            "info",
                            "sync",
                            "Uploading full delta",
                            data: new
                            {
                                files = changed.Count,
                                bytes = changedBytes,
                                zipMs = swZip.ElapsedMilliseconds,
                                zipPath,
                            }
                        )
                    );

                    // 5) Upload
                    var swUpload = Stopwatch.StartNew();
                    var ok = await http.SyncZipAsync(syncUrl, zipPath).ConfigureAwait(false);
                    swUpload.Stop();
                    if (!ok)
                        throw new Exception("sync endpoint returned non-OK");

                    // success → clear db-dirty flag
                    libraryDirty = false;

                    log.Info($"ViewerBridge Live Sync: uploaded delta with {changed.Count} files.");
                    rlog?.Enqueue(
                        RemoteLog.Build(
                            "info",
                            "sync",
                            "Upload complete",
                            data: new
                            {
                                files = changed.Count,
                                uploadMs = swUpload.ElapsedMilliseconds,
                                totalMs = swTotal.ElapsedMilliseconds,
                            }
                        )
                    );
                }
                finally
                {
                    // Always clean temp
                    try
                    {
                        if (!string.IsNullOrEmpty(zipPath) && File.Exists(zipPath))
                            File.Delete(zipPath);
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                log.Error(ex, "ViewerBridge Live Sync: upload failed");
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
                    AppConstants.Notif_LiveSync_Error,
                    "Live Sync upload failed",
                    NotificationType.Error
                );
            }
            finally
            {
                isUploading = false;
            }
        }

        private void SafeDelete(string path)
        {
            try
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                    File.Delete(path);
            }
            catch { }
        }

        private void CleanupTempOld(int maxAgeMinutes = 60)
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

        private List<LocalFile> ListLocalMediaFiles()
        {
            var list = new List<LocalFile>();
            var mediaDir = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName);
            if (!Directory.Exists(mediaDir))
                return list;

            foreach (var f in Directory.EnumerateFiles(mediaDir, "*", SearchOption.AllDirectories))
            {
                var relDisk = GetRelativePath(dataRoot, f).Replace('\\', '/'); // "library/files/..."
                var fi = new FileInfo(f);
                var mtime = fi.LastWriteTimeUtc;
                var ms = (long)
                    (mtime - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
                list.Add(
                    new LocalFile
                    {
                        Abs = f,
                        RelDisk = relDisk,
                        Size = fi.Length,
                        MTimeMs = ms,
                    }
                );
            }
            return list;
        }

        private static string GetRelativePath(string baseDir, string fullPath)
        {
            if (string.IsNullOrEmpty(baseDir))
                return fullPath;
            var baseUri = new Uri(AppendDirSep(baseDir));
            var pathUri = new Uri(fullPath);
            var rel = baseUri.MakeRelativeUri(pathUri).ToString();
            return Uri.UnescapeDataString(rel).Replace('/', Path.DirectorySeparatorChar);

            string AppendDirSep(string p) =>
                p.EndsWith(Path.DirectorySeparatorChar.ToString())
                    ? p
                    : p + Path.DirectorySeparatorChar;
        }

        // disk "library/files/*" → zip "libraryfiles/*"; disk "library/*" → zip "library/*"
        private static string MapToZipPath(string relPath)
        {
            var p = (relPath ?? string.Empty).Replace('\\', '/');
            var diskFiles = AppConstants.LibraryFilesDirName.Replace('\\', '/'); // "library/files"
            var diskLib = AppConstants.LibraryDirName.Replace('\\', '/'); // "library"
            var zipFiles = AppConstants.ZipFilesDirName; // "libraryfiles"
            var zipLib = AppConstants.ZipDirName; // "library"

            if (p.StartsWith(diskFiles, StringComparison.OrdinalIgnoreCase))
                return zipFiles + p.Substring(diskFiles.Length);
            if (p.StartsWith(diskLib, StringComparison.OrdinalIgnoreCase))
                return zipLib + p.Substring(diskLib.Length);
            return p;
        }

        // --- SDK export (shaped filenames) into the zip ---
        private void ExportSdkSnapshotToZip(ZipBuilder zb)
        {
            var meta = new
            {
                exportedAt = DateTime.UtcNow.ToString("o"),
                exporter = "PlayniteViewerBridge",
                playnite = api?.ApplicationInfo?.ApplicationVersion?.ToString(),
            };
            zb.AddText("export/meta.json", Playnite.SDK.Data.Serialization.ToJson(meta));

            zb.AddText(
                "export/games.Game.json",
                Playnite.SDK.Data.Serialization.ToJson(
                    api?.Database?.Games?.ToList()
                        ?? new System.Collections.Generic.List<Playnite.SDK.Models.Game>()
                )
            );

            zb.AddText(
                "export/platforms.Platform.json",
                Playnite.SDK.Data.Serialization.ToJson(
                    api?.Database?.Platforms?.ToList()
                        ?? new System.Collections.Generic.List<Playnite.SDK.Models.Platform>()
                )
            );

            zb.AddText(
                "export/sources.GameSource.json",
                Playnite.SDK.Data.Serialization.ToJson(
                    api?.Database?.Sources?.ToList()
                        ?? new System.Collections.Generic.List<Playnite.SDK.Models.GameSource>()
                )
            );

            zb.AddText("export/sources.Source.json", "[]");

            zb.AddText(
                "export/companies.Company.json",
                Playnite.SDK.Data.Serialization.ToJson(
                    api?.Database?.Companies?.ToList()
                        ?? new System.Collections.Generic.List<Playnite.SDK.Models.Company>()
                )
            );

            zb.AddText(
                "export/tags.Tag.json",
                Playnite.SDK.Data.Serialization.ToJson(
                    api?.Database?.Tags?.ToList()
                        ?? new System.Collections.Generic.List<Playnite.SDK.Models.Tag>()
                )
            );

            zb.AddText(
                "export/genres.Genre.json",
                Playnite.SDK.Data.Serialization.ToJson(
                    api?.Database?.Genres?.ToList()
                        ?? new System.Collections.Generic.List<Playnite.SDK.Models.Genre>()
                )
            );

            zb.AddText(
                "export/categories.Category.json",
                Playnite.SDK.Data.Serialization.ToJson(
                    api?.Database?.Categories?.ToList()
                        ?? new System.Collections.Generic.List<Playnite.SDK.Models.Category>()
                )
            );

            zb.AddText(
                "export/emulators.Emulator.json",
                Playnite.SDK.Data.Serialization.ToJson(
                    api?.Database?.Emulators?.ToList()
                        ?? new System.Collections.Generic.List<Playnite.SDK.Models.Emulator>()
                )
            );
        }

        public void Dispose()
        {
            try
            {
                debounce?.Dispose();
            }
            catch { }
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
        }
    }
}
