// Services/LocalStateSnapshotStore.cs
using System;
using System.IO;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;
using SyncniteBridge.Models;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Stores and retrieves local state snapshots to/from disk.
    /// </summary>
    internal sealed class LocalStateStore
    {
        private readonly string path;
        private readonly BridgeLogger? blog;

        /// <summary>
        /// Creates a new LocalStateStore instance.
        /// </summary>
        public LocalStateStore(string extensionsDataPath, BridgeLogger? blog = null)
        {
            Directory.CreateDirectory(extensionsDataPath ?? ".");
            path = Path.Combine(extensionsDataPath ?? ".", AppConstants.SnapshotFileName);
            this.blog = blog;

            blog?.Debug("snapshot", "Snapshot store initialized", new { path });
        }

        /// <summary>
        /// Loads the local state snapshot from disk.
        /// </summary>
        public LocalStateSnapshot Load()
        {
            try
            {
                if (!File.Exists(path))
                {
                    blog?.Debug("snapshot", "No existing snapshot on disk", new { path });
                    return new LocalStateSnapshot();
                }

                var json = File.ReadAllText(path);
                var s =
                    Playnite.SDK.Data.Serialization.FromJson<LocalStateSnapshot>(json)
                    ?? new LocalStateSnapshot();

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
                return new LocalStateSnapshot();
            }
        }

        /// <summary>
        /// Saves the local state snapshot to disk.
        /// </summary>
        public void Save(LocalStateSnapshot snapshot)
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
        /// Deletes the local state snapshot from disk.
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
