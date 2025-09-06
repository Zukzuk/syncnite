using Playnite.SDK;
using Playnite.SDK.Plugins;
using Playnite.SDK.Events;
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Web;

namespace PlayniteViewerBridge
{
    public class PlayniteViewerBridge : GenericPlugin
    {
        private static readonly ILogger logger = LogManager.GetLogger();
        private readonly IPlayniteAPI api;

        public override Guid Id { get; } = Guid.Parse("a85f0db8-39f4-40ea-9e03-bc5be2298c89");

        public PlayniteViewerBridge(IPlayniteAPI api) : base(api)
        {
            this.api = api;

            api.UriHandler.RegisterSource("viewer", args =>
            {
                try
                {
                    if (args?.Arguments?.Length > 0 && string.Equals(args.Arguments[0], "restore", StringComparison.OrdinalIgnoreCase))
                    {
                        HandleRestore(args.Arguments.Skip(1).ToArray());
                    }
                }
                catch (Exception ex)
                {
                    logger.Error(ex, "Restore handler error");
                    api.Dialogs.ShowErrorMessage(ex.Message, "Restore");
                }
            });
        }

        private void HandleRestore(string[] tail)
        {
            var q = string.Join("/", tail ?? Array.Empty<string>());
            var uri = new Uri("playnite://viewer/restore" + (q.StartsWith("?") ? q : "?" + q));
            var qs = HttpUtility.ParseQueryString(uri.Query);

            var fileParam = qs["file"];
            var urlParam = qs["url"];
            var items = qs["items"]; // "0,1,2,3,4,5" default

            string backupZip;
            if (!string.IsNullOrWhiteSpace(fileParam) && File.Exists(fileParam))
            {
                backupZip = fileParam;
            }
            else if (!string.IsNullOrWhiteSpace(urlParam))
            {
                var temp = Path.Combine(Path.GetTempPath(), "PlayniteBackup-" + Guid.NewGuid() + ".zip");
                using (var wc = new WebClient())
                {
                    wc.DownloadFile(urlParam, temp);
                }
                backupZip = temp;
            }
            else
            {
                throw new InvalidOperationException("No backup specified (need ?file=... or ?url=...).");
            }

            var dataDir = api.Paths.ConfigurationPath;
            var libraryDir = Path.Combine(dataDir, "library");
            var itemsJson = string.IsNullOrWhiteSpace(items) ? "0,1,2,3,4,5" : items;

            var cfgPath = Path.Combine(Path.GetTempPath(), "restore_config.json");
            var json = $@"{{
  ""BackupFile"": ""{backupZip.Replace("\\", "\\\\")}"",
  ""DataDir"": ""{dataDir.Replace("\\", "\\\\")}"",
  ""LibraryDir"": ""{libraryDir.Replace("\\", "\\\\")}"",
  ""RestoreItems"": [{itemsJson}],
  ""ClosedWhenDone"": false,
  ""CancelIfGameRunning"": true
}}";
            File.WriteAllText(cfgPath, json);

            api.Dialogs.ShowMessage("Playnite will restart to restore the selected backup.", "Restore");

            var exe = Process.GetCurrentProcess().MainModule?.FileName
                      ?? throw new InvalidOperationException("Cannot locate Playnite executable.");

            Process.Start(new ProcessStartInfo
            {
                FileName = exe,
                Arguments = $"--restorebackup \"{cfgPath}\"",
                UseShellExecute = false
            });

            Environment.Exit(0); // ✅ Replaces api.Application.Quit()
        }
    }
}
