using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    internal sealed class DeltaSyncService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private readonly ILogger log = LogManager.GetLogger();
        private readonly RemoteLogClient rlog;

        private string syncUrl;
        private readonly string dataRoot;

        private readonly HttpClientEx http;
        private readonly System.Timers.Timer debounce;

        private volatile bool pending;
        private volatile bool isUploading;
        private volatile bool dbDirty; // set when *.db changed (used to decide JSON delta)
        private volatile bool dirty; // run again after current upload finishes

        private FileSystemWatcher libWatcher;
        private FileSystemWatcher mediaWatcher;

        private readonly string tempDir;
        private readonly object dirtyMediaLock = new object();
        private readonly HashSet<string> dirtyMediaFolders = new HashSet<string>(
            StringComparer.OrdinalIgnoreCase
        );

        private Func<bool> isHealthy = () => true; // injected

        public DeltaSyncService(
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

            debounce = new System.Timers.Timer(AppConstants.DebounceMs_Sync) { AutoReset = false };
            debounce.Elapsed += async (s, e) => await OnDebouncedAsync().ConfigureAwait(false);

            tempDir = Path.Combine(Path.GetTempPath(), AppConstants.TempDirName, "sync");
            Directory.CreateDirectory(tempDir);
        }

        public void SetHealthProvider(Func<bool> provider) => isHealthy = provider ?? (() => true);

        public void UpdateEndpoints(string newSync)
        {
            syncUrl = newSync?.Trim();
            rlog?.Enqueue(
                RemoteLog.Build("debug", "sync", "Endpoints updated", data: new { syncUrl })
            );
        }

        public void Start()
        {
            if (string.IsNullOrWhiteSpace(dataRoot) || !Directory.Exists(dataRoot))
            {
                api.Dialogs.ShowMessage("Delta Sync: Playnite data folder not found.");
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
                    "Delta Sync: expected 'library' and 'libraryfiles' under Playnite data root."
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

            // Attach watchers
            libWatcher = MakeWatcher(libraryDir, "*.db", includeSubdirs: false);
            mediaWatcher = MakeWatcher(mediaDir, "*", includeSubdirs: true);

            rlog?.Enqueue(
                RemoteLog.Build(
                    "info",
                    "sync",
                    "Delta sync started and watchers attached",
                    data: new
                    {
                        libraryDir,
                        mediaDir,
                        debounceMs = AppConstants.DebounceMs_Sync,
                    }
                )
            );

            // --- Seed initial run so first health-trigger performs a full push ---
            // 1) Force JSON upload on first run
            dbDirty = true;

            // 2) Pre-load all existing top-level media folders so first run uploads media too
            try
            {
                var seed = Directory
                    .EnumerateDirectories(mediaDir, "*", SearchOption.TopDirectoryOnly)
                    .Select(Path.GetFileName)
                    .Where(n => !string.IsNullOrEmpty(n))
                    .ToArray();
                lock (dirtyMediaLock)
                {
                    foreach (var folder in seed)
                        dirtyMediaFolders.Add(folder);
                }
                rlog?.Enqueue(
                    RemoteLog.Build(
                        "debug",
                        "sync",
                        "Initial seed prepared",
                        data: new { json = true, mediaFolders = seed.Length }
                    )
                );
            }
            catch (Exception ex)
            {
                rlog?.Enqueue(
                    RemoteLog.Build("warn", "sync", "Initial seed failed (media)", err: ex.Message)
                );
            }

            CleanupTempOld();
            // Do not trigger here; SyncniteBridge triggers on health flip → healthy.
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
            {
                dbDirty = true;
            }
            else if (e?.FullPath != null)
            {
                // Track changes under library/files → mark top-level media folder dirty
                var top = GetTopLevelMediaFolderFromPath(e.FullPath);
                if (!string.IsNullOrEmpty(top))
                {
                    lock (dirtyMediaLock)
                    {
                        dirtyMediaFolders.Add(top);
                    }
                }

                // If it was a rename, also consider the old path
                if (e is RenamedEventArgs re && !string.IsNullOrEmpty(re.OldFullPath))
                {
                    var oldTop = GetTopLevelMediaFolderFromPath(re.OldFullPath);
                    if (!string.IsNullOrEmpty(oldTop))
                    {
                        lock (dirtyMediaLock)
                        {
                            dirtyMediaFolders.Add(oldTop);
                        }
                    }
                }
            }

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
                pending = true; // keep pending for flip-to-healthy
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
                    RemoteLog.Build("debug", "sync", "Abort run: unhealthy; keep pending")
                );
                return;
            }

            pending = false;

            if (isUploading)
            {
                dirty = true; // remember to re-run
                rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Upload in progress; marked dirty"));
                return;
            }

            await DoUploadIfNeededAsync().ConfigureAwait(false);
        }

        // -------------------- Manifest & Delta logic --------------------

        private sealed class LocalManifest
        {
            public Dictionary<string, (long size, long mtimeMs)> Json { get; } =
                new Dictionary<string, (long, long)>(StringComparer.OrdinalIgnoreCase);
            public HashSet<string> MediaFolders { get; } =
                new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            public (int count, string hash) Installed { get; set; }
        }

        private LocalManifest BuildLocalManifest()
        {
            var m = new LocalManifest();

            // JSON state driven by Playnite DB files: *.db under dataRoot/library
            var libDir = Path.Combine(dataRoot, AppConstants.LibraryDirName);
            foreach (
                var f in Directory.EnumerateFiles(libDir, "*.db", SearchOption.TopDirectoryOnly)
            )
            {
                var fi = new FileInfo(f);
                var ms = (long)
                    (
                        fi.LastWriteTimeUtc - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                    ).TotalMilliseconds;

                // Map DB → shaped JSON export name (stable):
                // We export all JSONs together; we use the canonical filenames expected by the server.
                // Track the DB by a representative export JSON name (coarse, but sufficient).
                var name = Path.GetFileNameWithoutExtension(f).ToLowerInvariant();
                // simple mapping table:
                // games.db → games.Game.json, platforms.db → platforms.Platform.json, etc.
                string jsonName = name switch
                {
                    "games" => "games.Game.json",
                    "platforms" => "platforms.Platform.json",
                    "sources" => "sources.GameSource.json",
                    "companies" => "companies.Company.json",
                    "tags" => "tags.Tag.json",
                    "genres" => "genres.Genre.json",
                    "categories" => "categories.Category.json",
                    "emulators" => "emulators.Emulator.json",
                    _ => $"{name}.json",
                };

                m.Json[jsonName] = (fi.Length, ms);
            }

            // Top-level media folders under dataRoot/library/files/
            var lfRoot = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName);
            if (Directory.Exists(lfRoot))
            {
                foreach (
                    var d in Directory.EnumerateDirectories(
                        lfRoot,
                        "*",
                        SearchOption.TopDirectoryOnly
                    )
                )
                {
                    var folder = Path.GetFileName(d);
                    if (!string.IsNullOrEmpty(folder))
                        m.MediaFolders.Add(folder);
                }
            }

            // Installed summary (count + cheap deterministic hash)
            var installedIds = api
                .Database.Games.Where(g => g.IsInstalled)
                .Select(g => g.Id.ToString())
                .OrderBy(x => x, StringComparer.Ordinal)
                .ToArray();
            var count = installedIds.Length;
            var bytes = System.Text.Encoding.UTF8.GetBytes(string.Join(",", installedIds));
            string hashHex;
            using (var sha1 = System.Security.Cryptography.SHA1.Create())
            {
                var hash = sha1.ComputeHash(bytes);
                hashHex = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            }
            m.Installed = (count, hashHex);

            return m;
        }

        private static bool JsonStateDiffers(
            LocalManifest local,
            HttpClientEx.RemoteManifest remote
        )
        {
            // If any tracked JSON name missing remotely, or size/mtime mismatch → differs
            foreach (var kv in local.Json)
            {
                if (!remote.json.TryGetValue(kv.Key, out var r))
                    return true;
                if (r.size != kv.Value.size || r.mtimeMs != kv.Value.mtimeMs)
                    return true;
            }
            return false;
        }

        private static List<string> MediaFoldersToUpload(
            LocalManifest local,
            HttpClientEx.RemoteManifest remote
        )
        {
            var remoteSet = new HashSet<string>(
                remote.mediaFolders ?? new List<string>(),
                StringComparer.OrdinalIgnoreCase
            );
            // Upload only new top-level folders (per requirement)
            return local
                .MediaFolders.Where(f => !remoteSet.Contains(f))
                .OrderBy(s => s, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private async Task DoUploadIfNeededAsync()
        {
            isUploading = true;
            var swTotal = Stopwatch.StartNew();

            try
            {
                if (string.IsNullOrWhiteSpace(syncUrl))
                {
                    rlog?.Enqueue(
                        RemoteLog.Build("error", "sync", "Missing endpoints", data: new { syncUrl })
                    );
                    return;
                }

                // 1) Build local manifest (needed for manifest.json we ship)
                var local = BuildLocalManifest(); // <-- this was missing

                // 2) Decide deltas (no remote manifest; JSON only when DB changed)
                var needJson = dbDirty;

                // Start with any folders we already know changed (from watcher events)
                List<string> mediaFolders;
                lock (dirtyMediaLock)
                {
                    mediaFolders = dirtyMediaFolders.ToList();
                }
                // Remove duplicates, keep stable order
                mediaFolders = mediaFolders.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

                if (!needJson && mediaFolders.Count == 0)
                {
                    rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Up-to-date; no upload needed"));
                    return;
                }

                // 3) Build single ZIP with only needed stuff; keep only the latest temp zip
                Directory.CreateDirectory(tempDir);
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
                    $"PlayniteSync-{DateTime.UtcNow:yyyy-MM-dd-HH-mm-ss}.zip"
                );
                var swZip = Stopwatch.StartNew();
                using (var zb = new ZipBuilder(zipPath))
                {
                    // 3a) Export manifest.json (library manifest; NO installed info)
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
                    };
                    zb.AddText(
                        "export/manifest.json",
                        Playnite.SDK.Data.Serialization.ToJson(manifestObj)
                    );

                    // 3b) Export JSONs only when needed
                    if (needJson)
                    {
                        ExportSdkSnapshotToZip(zb);
                    }

                    // 3c) Media: include top-level folders marked dirty
                    foreach (var folder in mediaFolders)
                    {
                        AddMediaFolderRecursively(zb, folder);
                    }
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

                // 4) Upload
                var swUpload = Stopwatch.StartNew();
                var ok = await http.SyncZipAsync(syncUrl, zipPath).ConfigureAwait(false);
                swUpload.Stop();
                if (!ok)
                    throw new Exception("sync endpoint returned non-OK");

                // 5) Success → clear dirty flags
                dbDirty = false;
                lock (dirtyMediaLock)
                {
                    dirtyMediaFolders.Clear();
                }

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

                if (dirty)
                {
                    dirty = false;
                    rlog?.Enqueue(RemoteLog.Build("debug", "sync", "Processing dirty re-run"));
                    Trigger(); // will debounce and rerun
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
            finally
            {
                isUploading = false;
            }
        }

        // Helper: get relative path (net462-safe)
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

        private string GetTopLevelMediaFolderFromPath(string fullPath)
        {
            if (string.IsNullOrWhiteSpace(fullPath))
                return null;

            var mediaRoot = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName); // "library/files"
            // Normalize trailing directory separator for robust prefix checks
            string AppendSep(string p) =>
                p.EndsWith(Path.DirectorySeparatorChar.ToString())
                    ? p
                    : p + Path.DirectorySeparatorChar;
            mediaRoot = AppendSep(mediaRoot);

            // Ensure the path lies under the media root
            if (!fullPath.StartsWith(mediaRoot, StringComparison.OrdinalIgnoreCase))
                return null;

            // Derive relative path under library/files
            var rel = fullPath.Substring(mediaRoot.Length);
            rel = rel.TrimStart(Path.DirectorySeparatorChar);

            // First segment is the top-level folder we zip as a unit
            var first = rel.Split(new[] { Path.DirectorySeparatorChar }, 2, StringSplitOptions.None)
                .FirstOrDefault();
            return string.IsNullOrWhiteSpace(first) ? null : first;
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

        // Recursively add a top-level media folder to the ZIP
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

        // --- SDK export (shaped filenames) into the zip ---
        private void ExportSdkSnapshotToZip(ZipBuilder zb)
        {
            var meta = new
            {
                exportedAt = DateTime.UtcNow.ToString("o"),
                exporter = "SyncniteBridge",
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
