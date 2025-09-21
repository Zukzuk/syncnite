using Playnite.SDK;
using Playnite.SDK.Plugins;
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net; // WebClient (net462)
using System.Text;
using System.Timers;

namespace PlayniteViewerBridge
{
    public class PlayniteViewerBridge : GenericPlugin
    {
        // Must match extension.yaml Id
        public override Guid Id { get; } = Guid.Parse("a85f0db8-39f4-40ea-9e03-bc5be2298c89");

        private readonly ILogger logger = LogManager.GetLogger();
        private InstalledPusher pusher;
        private BridgeConfig config;
        private readonly string configPath;
        private readonly Timer startupKick; // delayed initial push (no OnApplicationStarted in SDK 6.x)

        public PlayniteViewerBridge(IPlayniteAPI api) : base(api)
        {
            // Load / create config
            configPath = Path.Combine(GetPluginUserDataPath(), "config.json");
            config = BridgeConfig.Load(configPath);

            // Start the installed pusher
            pusher = new InstalledPusher(api, config.Endpoint);

            // Kick an initial push a few seconds after startup
            startupKick = new Timer(3000) { AutoReset = false };
            startupKick.Elapsed += (s, e) => { try { pusher.Trigger(); } catch { } };
            startupKick.Start();

            Properties = new GenericPluginProperties { HasSettings = false };
        }

        // No OnApplicationStarted override in Playnite 6.x

        public override System.Collections.Generic.IEnumerable<MainMenuItem> GetMainMenuItems(GetMainMenuItemsArgs args)
        {
            return new[]
            {
                new MainMenuItem
                {
                    Description = "ViewerBridge",
                    Action = _ =>
                    {
                        try
                        {
                            var win = new SettingsWindow(
                                initialEndpoint: config.Endpoint,
                                onSave: newEp =>
                                {
                                    config.Endpoint = newEp;
                                    BridgeConfig.Save(configPath, config);
                                    if (pusher != null) pusher.UpdateEndpoint(newEp);
                                    logger.Info("ViewerBridge: endpoint updated to " + newEp);
                                },
                                onPush: () => { try { pusher?.PushNow(); } catch { } }
                            );
                            win.Owner = null; // Playnite host window not exposed in SDK 6; modeless OK
                            win.Show();
                        }
                        catch (Exception ex)
                        {
                            logger.Error(ex, "ViewerBridge: failed to open settings window");
                        }
                    }
                }
            };
        }

        public override void Dispose()
        {
            base.Dispose();
            try { startupKick?.Dispose(); } catch { }
            try { pusher?.Dispose(); } catch { }
        }

        // ----------------- Single-file inner types -----------------

        /// <summary>Watches Playnite DB and pushes the installed GUID list to your API (net462 + SDK 6.x safe).</summary>
        private sealed class InstalledPusher : IDisposable
        {
            private readonly IPlayniteAPI api;
            private string endpoint; // e.g. http://localhost:3000/api/playnitelive/push
            private readonly Timer debounce;
            private readonly ILogger log = LogManager.GetLogger();

            public void UpdateEndpoint(string endpoint)
            {
                this.endpoint = (endpoint ?? "").TrimEnd('/');
            }

            public InstalledPusher(IPlayniteAPI api, string endpoint)
            {
                this.api = api;
                this.endpoint = (endpoint ?? "").TrimEnd('/');

                // Debounce rapid changes
                this.debounce = new Timer(1500) { AutoReset = false };
                this.debounce.Elapsed += (s, e) => PushInstalledSafe();

                // Playnite 6.x: use ItemCollectionChanged + ItemUpdated
                api.Database.Games.ItemCollectionChanged += (s, e) => Trigger();
                api.Database.Games.ItemUpdated += (s, e) => Trigger();
            }

            public void Trigger()
            {
                try { debounce.Stop(); debounce.Start(); } catch { }
            }

            public void PushNow()
            {
                try { debounce.Stop(); } catch { }
                PushInstalledSafe();
            }

            private string BuildPayload()
            {
                // Minimal JSON (no System.Text.Json on net462)
                var installed = api.Database.Games
                    .Where(g => g.IsInstalled)
                    .Select(g => g.Id.ToString())
                    .ToArray();

                var sb = new StringBuilder();
                sb.Append("{\"installed\":[");
                for (int i = 0; i < installed.Length; i++)
                {
                    if (i > 0) sb.Append(',');
                    sb.Append('\"').Append(installed[i]).Append('\"');
                }
                sb.Append("]}");
                return sb.ToString();
            }

            private async void PushInstalledSafe()
            {
                try
                {
                    var payload = BuildPayload();
                    var url = endpoint;

                    using (var wc = new WebClient())
                    {
                        wc.Headers[HttpRequestHeader.ContentType] = "application/json";
                        string resp = await wc.UploadStringTaskAsync(new Uri(url), "POST", payload);
                        int count = api.Database.Games.Count(g => g.IsInstalled);

                        log.Info("ViewerBridge pushed installed list (" + count + ") → " + url);
                    }
                }
                catch (WebException wex)
                {
                    log.Error(wex, "ViewerBridge push error (WebException)");
                }
                catch (Exception ex)
                {
                    log.Error(ex, "ViewerBridge push error");
                }
            }

            public void Dispose()
            {
                try { debounce.Dispose(); } catch { }
                // Lambdas attached; safe on plugin unload in SDK 6.x
            }
        }

        /// <summary>Tiny JSON config stored in the plugin data folder.</summary>
        private sealed class BridgeConfig
        {
            public string Endpoint = "http://localhost:3000/api/playnitelive/push";

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
                    if (!string.IsNullOrWhiteSpace(ep)) cfg2.Endpoint = ep;
                    return cfg2;
                }
                catch (Exception ex)
                {
                    LogManager.GetLogger().Error(ex, "ViewerBridge: failed reading config, using defaults");
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
                if (i < 0) return null;
                i = json.IndexOf(':', i);
                if (i < 0) return null;
                i++;
                while (i < json.Length && char.IsWhiteSpace(json[i])) i++;
                if (i >= json.Length || json[i] != '\"') return null;
                i++;
                var sb = new StringBuilder();
                while (i < json.Length && json[i] != '\"')
                {
                    char ch = json[i++];
                    if (ch == '\\' && i < json.Length)
                    {
                        char n = json[i++];
                        if (n == '\"' || n == '\\') sb.Append(n);
                        else { sb.Append('\\').Append(n); }
                    }
                    else sb.Append(ch);
                }
                return sb.ToString();
            }

            private static string Escape(string s) => s.Replace("\\", "\\\\").Replace("\"", "\\\"");
        }
    }

    // Simple in-code settings window (no XAML) for SDK 6.x/net462
    internal sealed class SettingsWindow : System.Windows.Window
    {
        private readonly System.Windows.Controls.TextBox txtEndpoint;
        private readonly Action<string> onSave;
        private readonly Action onPush;

        public SettingsWindow(string initialEndpoint, Action<string> onSave, Action onPush)
        {
            this.onSave = onSave;
            this.onPush = onPush;

            Title = "Playnite Viewer Bridge";
            Width = 560;
            Height = 180;
            WindowStartupLocation = System.Windows.WindowStartupLocation.CenterScreen;
            ResizeMode = System.Windows.ResizeMode.NoResize;
            ShowInTaskbar = true;

            var root = new System.Windows.Controls.Grid
            {
                Margin = new System.Windows.Thickness(12)
            };
            root.RowDefinitions.Add(new System.Windows.Controls.RowDefinition { Height = new System.Windows.GridLength(1, System.Windows.GridUnitType.Auto) });
            root.RowDefinitions.Add(new System.Windows.Controls.RowDefinition { Height = new System.Windows.GridLength(1, System.Windows.GridUnitType.Auto) });
            root.RowDefinitions.Add(new System.Windows.Controls.RowDefinition { Height = new System.Windows.GridLength(1, System.Windows.GridUnitType.Star) });

            // Endpoint label
            var lbl = new System.Windows.Controls.TextBlock
            {
                Text = "API endpoint (POST /api/playnitelive/push):",
                Margin = new System.Windows.Thickness(0, 0, 0, 6)
            };
            System.Windows.Controls.Grid.SetRow(lbl, 0);
            root.Children.Add(lbl);

            // Endpoint textbox
            txtEndpoint = new System.Windows.Controls.TextBox
            {
                Text = initialEndpoint ?? "",
                Margin = new System.Windows.Thickness(0, 0, 0, 12)
            };
            System.Windows.Controls.Grid.SetRow(txtEndpoint, 1);
            root.Children.Add(txtEndpoint);

            // Buttons
            var buttons = new System.Windows.Controls.StackPanel
            {
                Orientation = System.Windows.Controls.Orientation.Horizontal,
                HorizontalAlignment = System.Windows.HorizontalAlignment.Right
            };

            var btnSave = new System.Windows.Controls.Button
            {
                Content = "Save",
                Width = 90,
                Margin = new System.Windows.Thickness(0, 0, 8, 0)
            };
            btnSave.Click += (s, e) => { TrySave(); };

            var btnPush = new System.Windows.Controls.Button
            {
                Content = "Push now",
                Width = 90,
                Margin = new System.Windows.Thickness(0, 0, 8, 0)
            };
            btnPush.Click += (s, e) => { TryPush(); };

            var btnClose = new System.Windows.Controls.Button
            {
                Content = "Close",
                Width = 90
            };
            btnClose.Click += (s, e) => { Close(); };

            buttons.Children.Add(btnSave);
            buttons.Children.Add(btnPush);
            buttons.Children.Add(btnClose);

            System.Windows.Controls.Grid.SetRow(buttons, 2);
            root.Children.Add(buttons);

            Content = root;
        }

        private void TrySave()
        {
            try
            {
                var val = (txtEndpoint.Text ?? "").Trim();
                if (string.IsNullOrEmpty(val)) return;
                onSave?.Invoke(val);
            }
            catch { /* ignore */ }
        }

        private void TryPush()
        {
            try { onPush?.Invoke(); }
            catch { /* ignore */ }
        }
    }
}
