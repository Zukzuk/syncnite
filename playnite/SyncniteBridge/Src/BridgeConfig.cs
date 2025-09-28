using System.IO;
using Playnite.SDK.Data;
using SyncniteBridge.Constants;

namespace SyncniteBridge
{
    internal sealed class BridgeConfig
    {
        public string ApiBase { get; set; } = AppConstants.DefaultApiBase;

        public static BridgeConfig Load(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    return Serialization.FromJson<BridgeConfig>(File.ReadAllText(path));
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
