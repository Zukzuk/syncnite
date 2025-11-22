using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Playnite.SDK.Data;
using SyncniteBridge.Constants;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Configuration settings for the bridge,
    /// persisted under ExtensionsData/&lt;GUID&gt;/config.json
    /// </summary>
    internal sealed class BridgeConfig
    {
        // Base URL of the Syncnite server (no trailing API path, e.g. "http://localhost:3003/")
        public string BaseUrlAndPort { get; set; } = AppConstants.DefaultBaseUrlAndPort;

        // Full API base (e.g. "http://localhost:3003/api/v1/") – derived from BaseUrl
        public string ApiBaseUrl =>
            (BaseUrlAndPort ?? AppConstants.DefaultBaseUrlAndPort) + AppConstants.DefaultApiUri;
        public string LogLevel { get; set; } = "info";

        public string AuthEmail { get; set; } = "";

        public string AuthPasswordEncrypted { get; set; } = "";

        /// <summary>
        /// Whether this Playnite installation has been recognized as the admin install.
        /// </summary>
        public bool IsAdminInstall { get; set; } = false;

        /// <summary>
        /// Unique identifier for this Playnite+extension installation.
        /// Used as X-Client-Id on all requests.
        /// </summary>
        public string ClientId { get; set; } = "";

        public string GetAuthPassword() => Crypto.Unprotect(AuthPasswordEncrypted);

        public void SetAuthPassword(string value) =>
            AuthPasswordEncrypted = Crypto.Protect(value ?? "");

        /// <summary>
        /// Load the config from disk. Ensures ClientId is always set, and that
        /// for the same machine/user/install path we get the same ClientId even if
        /// config.json is deleted.
        /// </summary>
        public static BridgeConfig Load(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    var json = File.ReadAllText(path);
                    var cfg = Serialization.FromJson<BridgeConfig>(json) ?? new BridgeConfig();

                    if (string.IsNullOrWhiteSpace(cfg.LogLevel))
                        cfg.LogLevel = "info";

                    if (string.IsNullOrWhiteSpace(cfg.ClientId))
                        cfg.ClientId = GenerateDeterministicClientId(path);

                    return cfg;
                }
            }
            catch
            {
                // swallow and fall through to fresh config
            }

            // No config on disk (or failed to read): create a new one with deterministic ClientId
            var fresh = new BridgeConfig
            {
                LogLevel = "info",
                ClientId = GenerateDeterministicClientId(path),
            };
            return fresh;
        }

        /// <summary>
        /// Save the config to disk (including ClientId).
        /// </summary>
        public static void Save(string path, BridgeConfig cfg)
        {
            try
            {
                var dir = Path.GetDirectoryName(path);
                if (!string.IsNullOrEmpty(dir))
                    Directory.CreateDirectory(dir);

                // As a safety net, ensure ClientId is never empty
                if (string.IsNullOrWhiteSpace(cfg.ClientId))
                    cfg.ClientId = GenerateDeterministicClientId(path);

                File.WriteAllText(path, Serialization.ToJson(cfg));
            }
            catch
            {
                // swallowing errors here is fine – config tweaks are non-critical
            }
        }

        /// <summary>
        /// Create a deterministic ID based on machine + user + install path.
        /// This gives the same ID for the same Playnite+extension installation,
        /// even if config.json is removed.
        /// </summary>
        private static string GenerateDeterministicClientId(string configPath)
        {
            try
            {
                var input = $"{Environment.MachineName}|{Environment.UserName}|{configPath}";
                using var sha = SHA256.Create();
                var bytes = Encoding.UTF8.GetBytes(input);
                var hash = sha.ComputeHash(bytes);

                // Use the first 16 bytes (32 hex chars) as our id
                var sb = new StringBuilder(32);
                for (int i = 0; i < 16 && i < hash.Length; i++)
                    sb.Append(hash[i].ToString("x2"));

                return sb.ToString();
            }
            catch
            {
                // If anything goes wrong, fall back to random – very rare edge case.
                return Guid.NewGuid().ToString("N");
            }
        }
    }
}
