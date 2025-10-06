using System.IO;
using Playnite.SDK.Data;
using SyncniteBridge.Constants;

namespace SyncniteBridge
{
    /// <summary>
    /// Configuration settings for the bridge, persisted under ExtensionsData/<GUID>/config.json.
    /// </summary>
    internal sealed class BridgeConfig
    {
        public string ApiBase { get; set; } = AppConstants.DefaultApiBase;

        // NEW: user-tunable log level for the extension logger
        // Allowed: "error" | "warn" | "info" | "debug" | "trace"
        public string LogLevel { get; set; } = "info";

        public static BridgeConfig Load(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    var cfg = Serialization.FromJson<BridgeConfig>(File.ReadAllText(path));
                    // Backward compat for older files that didn't have LogLevel:
                    if (cfg != null && string.IsNullOrWhiteSpace(cfg.LogLevel))
                        cfg.LogLevel = "info";
                    return cfg ?? new BridgeConfig();
                }
            }
            catch
            {
                // ignore and return defaults
            }
            return new BridgeConfig();
        }

        public static void Save(string path, BridgeConfig cfg)
        {
            try
            {
                var dir = Path.GetDirectoryName(path);
                if (!string.IsNullOrEmpty(dir))
                    Directory.CreateDirectory(dir);
                File.WriteAllText(path, Serialization.ToJson(cfg));
            }
            catch
            {
                // swallow; config changes are non-critical
            }
        }
    }
}
