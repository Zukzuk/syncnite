using System;
using System.IO;
using System.Text;
using Playnite.SDK;

namespace PlayniteViewerBridge
{
    /// <summary>Tiny JSON config stored in the plugin data folder.</summary>
    internal sealed class BridgeConfig
    {
        public string Endpoint = "http://localhost:3003/api/playnitelive/push";

        public static BridgeConfig Load(string path)
        {
            try
            {
                if (!File.Exists(path))
                {
                    var cfg = new BridgeConfig();
                    Save(path, cfg);
                    return cfg;
                }

                var txt = File.ReadAllText(path, Encoding.UTF8).Trim();
                var ep = TryExtractValue(txt, "endpoint");
                var cfg2 = new BridgeConfig();
                if (!string.IsNullOrWhiteSpace(ep))
                    cfg2.Endpoint = ep;
                return cfg2;
            }
            catch (Exception ex)
            {
                LogManager
                    .GetLogger()
                    .Error(ex, "ViewerBridge: failed reading config, using defaults");
                return new BridgeConfig();
            }
        }

        public static void Save(string path, BridgeConfig cfg)
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path) ?? ".");
                var json = "{\n  \"endpoint\": \"" + Escape(cfg.Endpoint) + "\"\n}\n";
                File.WriteAllText(path, json, Encoding.UTF8);
            }
            catch (Exception ex)
            {
                LogManager.GetLogger().Error(ex, "ViewerBridge: failed writing config");
            }
        }

        private static string TryExtractValue(string json, string key)
        {
            var needle = "\"" + key + "\"";
            int i = json.IndexOf(needle, StringComparison.OrdinalIgnoreCase);
            if (i < 0)
                return null;
            i = json.IndexOf(':', i);
            if (i < 0)
                return null;
            i++;
            while (i < json.Length && char.IsWhiteSpace(json[i]))
                i++;
            if (i >= json.Length || json[i] != '\"')
                return null;
            i++;
            var sb = new StringBuilder();
            while (i < json.Length && json[i] != '\"')
            {
                char ch = json[i++];
                if (ch == '\\' && i < json.Length)
                {
                    char n = json[i++];
                    if (n == '\"' || n == '\\')
                        sb.Append(n);
                    else
                        sb.Append('\\').Append(n);
                }
                else
                    sb.Append(ch);
            }
            return sb.ToString();
        }

        private static string Escape(string s) => s.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}
