using System;
using System.Collections.Generic;
using System.IO;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Persists the last successful upload snapshot
    /// under ExtensionsData/<GUID>/snapshot.json.
    /// </summary>
    internal sealed class SnapshotService
    {
        private readonly string path;
        private readonly BridgeLogger? blog;

        /// <summary>
        /// Snapshot structure.
        /// </summary>
        internal sealed class Snapshot
        {
            public string UpdatedAt { get; set; } = "";
            public long DbTicks { get; set; } = 0;
            public Dictionary<string, long> MediaVersions { get; set; } =
                new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="SnapshotService"/> class.
        /// </summary>
        public SnapshotService(string extensionsDataPath, BridgeLogger? blog = null)
        {
            Directory.CreateDirectory(extensionsDataPath ?? ".");
            path = Path.Combine(extensionsDataPath ?? ".", AppConstants.SnapshotFileName);
            this.blog = blog;

            blog?.Debug("snapshot", "Snapshot store initialized", new { path });
        }

        /// <summary>
        /// Load the last saved snapshot from disk.
        /// </summary>
        public Snapshot Load()
        {
            try
            {
                if (!File.Exists(path))
                {
                    blog?.Debug("snapshot", "No existing snapshot on disk", new { path });
                    return new Snapshot();
                }

                var json = File.ReadAllText(path);
                var s = Playnite.SDK.Data.Serialization.FromJson<Snapshot>(json) ?? new Snapshot();

                blog?.Debug(
                    "snapshot",
                    "Snapshot loaded",
                    new
                    {
                        updatedAt = s.UpdatedAt,
                        dbTicks = s.DbTicks,
                        mediaFolders = s.MediaVersions?.Count ?? 0,
                    }
                );

                return s;
            }
            catch (Exception ex)
            {
                blog?.Warn("snapshot", "Failed to load snapshot", new { path, err = ex.Message });
                return new Snapshot();
            }
        }

        /// <summary>
        /// Save the snapshot to disk.
        /// </summary>
        public void Save(Snapshot snapshot)
        {
            try
            {
                var json = Playnite.SDK.Data.Serialization.ToJson(snapshot);
                File.WriteAllText(path, json);

                blog?.Debug(
                    "snapshot",
                    "Snapshot saved",
                    new
                    {
                        path,
                        updatedAt = snapshot?.UpdatedAt,
                        dbTicks = snapshot?.DbTicks ?? 0,
                        mediaFolders = snapshot?.MediaVersions?.Count ?? 0,
                    }
                );
            }
            catch (Exception ex)
            {
                blog?.Warn("snapshot", "Failed to save snapshot", new { path, err = ex.Message });
            }
        }

        /// <summary>
        /// Delete the snapshot from disk.
        /// </summary>
        public void Delete()
        {
            try
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                    blog?.Info("snapshot", "Snapshot deleted", new { path });
                }
                else
                {
                    blog?.Debug("snapshot", "No snapshot to delete", new { path });
                }
            }
            catch (Exception ex)
            {
                blog?.Warn("snapshot", "Failed to delete snapshot", new { path, err = ex.Message });
            }
        }
    }
}
