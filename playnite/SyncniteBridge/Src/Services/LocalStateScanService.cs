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
    /// and build the snapshot.
    /// </summary>
    internal sealed class LocalStateScanService
    {
        private readonly IPlayniteAPI api;
        private readonly string dataRoot;
        private readonly BridgeLogger? blog;

        /// <summary>
        /// Initializes a new instance of the <see cref="LocalStateScanService"/> class.
        /// </summary>
        public LocalStateScanService(IPlayniteAPI api, string dataRoot, BridgeLogger? blog = null)
        {
            this.api = api;
            this.dataRoot = dataRoot ?? "";
            this.blog = blog;
        }

        /// <summary>
        /// Build a lightweight snapshot of current local state for diffing.
        /// </summary>
        public SnapshotService.Snapshot BuildSnapshot()
        {
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

            return new SnapshotService.Snapshot
            {
                UpdatedAt = DateTime.UtcNow.ToString("o"),
                DbTicks = dbTicks,
                MediaVersions = mediaVersions,
            };
        }

        /// <summary>
        /// Get the latest modification ticks among all DB files.
        /// </summary>
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

        /// <summary>
        /// Scan media folders and get their modification versions.
        /// </summary>
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
