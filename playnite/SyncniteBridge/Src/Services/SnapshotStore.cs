using System;
using System.Collections.Generic;
using System.IO;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Persists the last successful upload snapshot under ExtensionsData/<GUID>/lastManifest.json.
    /// </summary>
    internal sealed class SnapshotStore
    {
        private readonly string path;
        private readonly BridgeLogger blog;

        internal sealed class ManifestSnapshot
        {
            public string UpdatedAt { get; set; } = "";
            public long DbTicks { get; set; } = 0;
            public Dictionary<string, long> MediaVersions { get; set; } =
                new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        }

        public SnapshotStore(string extensionsDataPath, BridgeLogger blog = null)
        {
            Directory.CreateDirectory(extensionsDataPath ?? ".");
            path = Path.Combine(extensionsDataPath ?? ".", AppConstants.SnapshotFileName);
            this.blog = blog;

            blog?.Debug("snapshot", "Snapshot store initialized", new { path });
        }

        public ManifestSnapshot Load()
        {
            try
            {
                if (!File.Exists(path))
                {
                    blog?.Debug("snapshot", "No existing snapshot on disk", new { path });
                    return new ManifestSnapshot();
                }

                var json = File.ReadAllText(path);
                var s =
                    Playnite.SDK.Data.Serialization.FromJson<ManifestSnapshot>(json)
                    ?? new ManifestSnapshot();

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
                return new ManifestSnapshot();
            }
        }

        public void Save(ManifestSnapshot snapshot)
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
    }
}
