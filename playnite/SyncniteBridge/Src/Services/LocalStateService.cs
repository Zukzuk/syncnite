using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;
using SyncniteBridge.Models;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Tracks local state of Playnite installation (database and media folders).
    /// </summary>
    internal sealed class LocalStateService
    {
        private readonly IPlayniteAPI api;
        private readonly string dataRoot;
        private readonly BridgeLogger? blog;

        private readonly object gate = new object();
        private readonly HashSet<string> dirtyMediaFolders = new(StringComparer.OrdinalIgnoreCase);

        /// <summary>
        /// Cached media folder versions (last write ticks).
        /// </summary>
        private Dictionary<string, long> cachedMediaVersions = new(
            StringComparer.OrdinalIgnoreCase
        );

        /// <summary>
        /// Last known database last write ticks.
        /// </summary>
        private long lastDbTicks;

        /// <summary>
        /// Constructs local state service.
        /// </summary>
        public LocalStateService(IPlayniteAPI api, string dataRoot, BridgeLogger? blog = null)
        {
            this.api = api;
            this.dataRoot = dataRoot ?? "";
            this.blog = blog;
        }

        /// <summary>
        /// Marks a media folder as dirty, indicating it needs to be rescanned.
        /// </summary>
        public void MarkMediaFolderDirty(string? topLevelFolder)
        {
            if (string.IsNullOrWhiteSpace(topLevelFolder))
                return;

            lock (gate)
            {
                dirtyMediaFolders.Add(topLevelFolder!);
            }
        }

        /// <summary>
        /// Gets the count of dirty media folders.
        /// </summary>
        public int DirtyMediaFolderCount
        {
            get
            {
                lock (gate)
                {
                    return dirtyMediaFolders.Count;
                }
            }
        }

        /// <summary>
        /// Snapshot the current dirty folder names (does NOT clear them).
        /// </summary>
        public List<string> DirtyMediaFoldersSnapshot()
        {
            lock (gate)
            {
                return dirtyMediaFolders.ToList();
            }
        }

        /// <summary>
        /// Build a snapshot of current local state.
        /// fullRescan = true: scan all media folders.
        /// fullRescan = false: only update dirty folders, using cached state for the rest.
        /// </summary>
        public LocalStateSnapshot BuildSnapshot(bool fullRescan = false)
        {
            var libraryDir = Path.Combine(dataRoot, AppConstants.LibraryDirName);
            var mediaDir = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName);

            blog?.Debug(
                "scan",
                "Building snapshot",
                new
                {
                    libraryDir,
                    mediaDir,
                    fullRescan,
                }
            );

            lastDbTicks = LatestDbTicks(libraryDir);

            if (fullRescan || cachedMediaVersions.Count == 0)
            {
                cachedMediaVersions = ScanMediaVersions(mediaDir);
                // full rescan implicitly “processed” all folders, so no dirty set to clear here
                lock (gate)
                {
                    dirtyMediaFolders.Clear();
                }
            }
            else
            {
                UpdateDirtyMediaVersions(mediaDir);
            }

            var snapshot = new LocalStateSnapshot
            {
                UpdatedAt = DateTime.UtcNow.ToString("o"),
                DbTicks = lastDbTicks,
                MediaVersions = new Dictionary<string, long>(cachedMediaVersions),
            };

            blog?.Debug(
                "scan",
                "Snapshot built",
                new
                {
                    snapshot.DbTicks,
                    mediaFolders = snapshot.MediaVersions.Count,
                    dirtyCount = DirtyMediaFolderCount,
                    fullRescan,
                }
            );

            return snapshot;
        }

        /// <summary>
        /// Gets the latest database last write ticks in the library directory.
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
        /// Scans media directory for folder last write ticks.
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

                    var t = Directory.GetLastWriteTimeUtc(dir).Ticks;
                    map[name] = t;
                }
            }
            catch { }

            return map;
        }

        /// <summary>
        /// Updates cached media versions for dirty folders.
        /// </summary>
        private void UpdateDirtyMediaVersions(string mediaDir)
        {
            List<string> dirty;
            lock (gate)
            {
                dirty = dirtyMediaFolders.ToList();
                dirtyMediaFolders.Clear();
            }

            if (!dirty.Any())
                return;

            try
            {
                foreach (var folder in dirty)
                {
                    var dir = Path.Combine(mediaDir, folder);
                    if (!Directory.Exists(dir))
                    {
                        cachedMediaVersions.Remove(folder);
                        continue;
                    }

                    var t = Directory.GetLastWriteTimeUtc(dir).Ticks;
                    cachedMediaVersions[folder] = t;
                }
            }
            catch
            {
                // next fullRescan will fix
            }
        }
    }
}
