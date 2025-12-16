using System;
using System.IO;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;
using SyncniteBridge.Models;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Manages local storage of the last known snapshot of the Playnite database state.
    /// </summary>
    internal sealed class LocalStateStore
    {
        private readonly string dir;
        private readonly Func<string> getEndpoint;
        private readonly BridgeLogger? blog;

        /// <summary>
        /// Creates a new instance of the <see cref="LocalStateStore"/> class.
        /// </summary>
        public LocalStateStore(
            string extensionsDataPath,
            Func<string> getEndpoint,
            BridgeLogger? blog = null
        )
        {
            dir = extensionsDataPath ?? ".";
            Directory.CreateDirectory(dir);

            this.getEndpoint = getEndpoint ?? (() => "");
            this.blog = blog;

            blog?.Debug("snapshot", "Snapshot store initialized", new { dir });
        }

        /// <summary>
        /// Gets the current snapshot file path based on the configured endpoint.
        /// </summary>
        private string CurrentPath
        {
            get
            {
                var endpoint = (getEndpoint() ?? "").Trim();
                var host = "unknown";

                try
                {
                    var uri = new Uri(endpoint, UriKind.Absolute);
                    host = uri.Host;
                }
                catch
                {
                    // leave as "unknown"
                }

                // filesystem-safe
                host = host.Replace("\\", "_").Replace("/", "_").Replace(":", "_");

                return Path.Combine(dir, $"{host}.{AppConstants.SnapshotFileName}");
            }
        }

        /// <summary>
        /// Loads the last known local state snapshot from disk.
        /// </summary>
        public LocalStateSnapshot Load()
        {
            var path = CurrentPath;
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
                        path,
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
        /// Saves the given local state snapshot to disk.
        /// </summary>
        public void Save(LocalStateSnapshot snapshot)
        {
            var path = CurrentPath;
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
        /// Deletes the existing local state snapshot from disk.
        /// </summary>
        public void Delete()
        {
            var path = CurrentPath;
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
