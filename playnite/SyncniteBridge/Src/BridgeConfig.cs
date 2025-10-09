using System.IO;
using Playnite.SDK.Data;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge
{
    /// <summary>
    /// Configuration settings for the bridge, persisted under ExtensionsData/<GUID>/config.json.
    /// </summary>
    internal sealed class BridgeConfig
    {
        // Base URL for the Syncnite API server
        public string ApiBase { get; set; } = AppConstants.DefaultApiBase;

        // user-tunable log level: "error" | "warn" | "info" | "debug" | "trace"
        public string LogLevel { get; set; } = "info";

        // Admin account (email is fine to serialize)
        public string AuthEmail { get; set; } = "";

        // Store password encrypted at rest; only this field is serialized
        public string AuthPasswordEncrypted { get; set; } = "";

        // Convenience helpers (NOT serialized—methods aren’t serialized)
        public string GetAuthPassword() => Crypto.Unprotect(AuthPasswordEncrypted);

        public void SetAuthPassword(string value) =>
            AuthPasswordEncrypted = Crypto.Protect(value ?? "");

        public static BridgeConfig Load(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    var cfg = Serialization.FromJson<BridgeConfig>(File.ReadAllText(path));
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
