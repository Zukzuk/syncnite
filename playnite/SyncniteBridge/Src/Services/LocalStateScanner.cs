using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Knows how to read current local state: DB ticks, media folder mtimes,
    /// and build the manifest payload we embed into the ZIP.
    /// </summary>
    internal sealed class LocalStateScanner
    {
        private readonly IPlayniteAPI api;
        private readonly string dataRoot;
        private readonly BridgeLogger blog;

        public LocalStateScanner(IPlayniteAPI api, string dataRoot, BridgeLogger blog = null)
        {
            this.api = api;
            this.dataRoot = dataRoot ?? "";
            this.blog = blog;
        }

        public SnapshotStore.ManifestSnapshot BuildSnapshot()
        {
            // DEBUG: we’re about to build a lightweight snapshot used for initial diffing.
            blog?.Debug(
                "scan",
                "Building snapshot",
                new
                {
                    libraryDir = Path.Combine(dataRoot, AppConstants.LibraryDirName),
                    mediaDir = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName),
                }
            );

            var dbTicks = LatestDbTicks(Path.Combine(dataRoot, AppConstants.LibraryDirName));
            var mediaVersions = ScanMediaVersions(
                Path.Combine(dataRoot, AppConstants.LibraryFilesDirName)
            );

            blog?.Debug(
                "scan",
                "Snapshot built",
                new { dbTicks, mediaFolders = mediaVersions.Count }
            );

            return new SnapshotStore.ManifestSnapshot
            {
                UpdatedAt = DateTime.UtcNow.ToString("o"),
                DbTicks = dbTicks,
                MediaVersions = mediaVersions,
            };
        }

        public (
            Dictionary<string, (long size, long mtimeMs)> Json,
            List<string> MediaFolders,
            (int count, string hash) Installed
        ) BuildLocalManifestView()
        {
            blog?.Debug("scan", "Building local manifest view");

            var json = new Dictionary<string, (long, long)>(StringComparer.OrdinalIgnoreCase);
            var mediaFolders = new List<string>();

            // DB files → size + mtimeMs
            try
            {
                var libDir = Path.Combine(dataRoot, AppConstants.LibraryDirName);
                foreach (
                    var path in Directory.EnumerateFiles(
                        libDir,
                        "*.db",
                        SearchOption.TopDirectoryOnly
                    )
                )
                {
                    var fi = new FileInfo(path);
                    var mtimeMs = new DateTimeOffset(fi.LastWriteTimeUtc).ToUnixTimeMilliseconds();
                    json[Path.GetFileName(path)] = (fi.Length, mtimeMs);
                }
                blog?.Debug("scan", "DB summary collected", new { files = json.Count });
            }
            catch (Exception ex)
            {
                blog?.Warn("scan", "Failed to collect DB summary", new { err = ex.Message });
            }

            // top-level media folders under library/files
            try
            {
                var mediaRoot = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName);
                if (Directory.Exists(mediaRoot))
                {
                    foreach (
                        var d in Directory.GetDirectories(
                            mediaRoot,
                            "*",
                            SearchOption.TopDirectoryOnly
                        )
                    )
                    {
                        var name = Path.GetFileName(d);
                        if (!string.IsNullOrWhiteSpace(name))
                            mediaFolders.Add(name);
                    }
                }
                blog?.Debug("scan", "Media folders listed", new { folders = mediaFolders.Count });
            }
            catch (Exception ex)
            {
                blog?.Warn("scan", "Failed to enumerate media folders", new { err = ex.Message });
            }

            // installed signature (count + hash)
            List<string> installedIds;
            try
            {
                installedIds =
                    api.Database.Games?.Where(g => g.IsInstalled)
                        .Select(g => g.Id.ToString().ToLowerInvariant())
                        .OrderBy(s => s, StringComparer.Ordinal)
                        .ToList() ?? new List<string>();
            }
            catch (Exception ex)
            {
                // Very defensive: database access exceptions shouldn’t crash the scan
                installedIds = new List<string>();
                blog?.Warn("scan", "Failed to enumerate installed games", new { err = ex.Message });
            }

            var installedHash = HashUtil.Sha1(string.Join("\n", installedIds));
            var installed = (installedIds.Count, installedHash);

            blog?.Debug(
                "scan",
                "Local manifest view built",
                new
                {
                    jsonFiles = json.Count,
                    mediaFolders = mediaFolders.Count,
                    installedCount = installed.Item1,
                }
            );

            return (json, mediaFolders, installed);
        }

        private static long LatestDbTicks(string libraryDir)
        {
            try
            {
                long max = 0;
                foreach (
                    var f in Directory.GetFiles(libraryDir, "*.db", SearchOption.TopDirectoryOnly)
                )
                {
                    var t = File.GetLastWriteTimeUtc(f).Ticks;
                    if (t > max)
                        max = t;
                }
                return max;
            }
            catch
            {
                return 0;
            }
        }

        private static Dictionary<string, long> ScanMediaVersions(string mediaDir)
        {
            var map = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
            try
            {
                if (!Directory.Exists(mediaDir))
                    return map;

                foreach (
                    var dir in Directory.GetDirectories(
                        mediaDir,
                        "*",
                        SearchOption.TopDirectoryOnly
                    )
                )
                {
                    var name = Path.GetFileName(dir);
                    if (string.IsNullOrWhiteSpace(name))
                        continue;
                    var t = Directory.GetLastWriteTimeUtc(dir).Ticks; // folder mtime
                    map[name] = t;
                }
            }
            catch { }
            return map;
        }
    }
}
