using System;
using System.Collections.Generic;
using System.IO;
using Playnite.SDK;
using SyncniteBridge.Constants;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Persists the last successful upload snapshot under ExtensionsData/<GUID>/lastManifest.json.
    /// </summary>
    internal sealed class SnapshotStore
    {
        private readonly string path;

        internal sealed class ManifestSnapshot
        {
            public string UpdatedAt { get; set; } = "";
            public long DbTicks { get; set; } = 0;
            public Dictionary<string, long> MediaVersions { get; set; } =
                new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        }

        public SnapshotStore(string extensionsDataPath)
        {
            Directory.CreateDirectory(extensionsDataPath ?? ".");
            path = Path.Combine(extensionsDataPath ?? ".", AppConstants.SnapshotFileName);
        }

        public ManifestSnapshot Load()
        {
            try
            {
                if (!File.Exists(path))
                    return new ManifestSnapshot();
                var json = File.ReadAllText(path);
                var s = Playnite.SDK.Data.Serialization.FromJson<ManifestSnapshot>(json);
                return s ?? new ManifestSnapshot();
            }
            catch
            {
                return new ManifestSnapshot();
            }
        }

        public void Save(ManifestSnapshot snapshot)
        {
            try
            {
                var json = Playnite.SDK.Data.Serialization.ToJson(snapshot);
                File.WriteAllText(path, json);
            }
            catch
            { /* ignore */
            }
        }
    }
}
