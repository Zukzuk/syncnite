using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using Playnite.SDK;

namespace PlayniteViewerBridge
{
    internal static class SettingsWindowFactory
    {
        public static void BuildAndShow(
            IPlayniteAPI api,
            string initialEndpoint,
            Action<string> onSave,
            Action onPush
        )
        {
            // 1) Create a Playnite-themed window (SDK way)
            var win = api.Dialogs.CreateWindow(
                new WindowCreationOptions { ShowMinimizeButton = false }
            );
            win.Title = "Playnite Viewer Bridge";
            win.Width = 560;
            win.Height = 220;
            win.Owner = api.Dialogs.GetCurrentAppWindow();
            win.WindowStartupLocation = WindowStartupLocation.CenterOwner;

            // Ensure theme brushes apply (CreateWindow already scopes to theme; these are extra-safe defaults)
            ThemeHelpers.HookThemeBackground(win);
            ThemeHelpers.HookThemeForeground(win);

            // 2) Build content
            var root = new Grid { Margin = new Thickness(12) };
            root.RowDefinitions.Add(
                new RowDefinition { Height = new GridLength(1, GridUnitType.Auto) }
            ); // status
            root.RowDefinitions.Add(
                new RowDefinition { Height = new GridLength(1, GridUnitType.Auto) }
            ); // label
            root.RowDefinitions.Add(
                new RowDefinition { Height = new GridLength(1, GridUnitType.Auto) }
            ); // textbox
            root.RowDefinitions.Add(
                new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }
            ); // buttons

            var lblStatus = new TextBlock
            {
                Text = "Health: (checking…)",
                Margin = new Thickness(0, 0, 0, 8),
            };
            ThemeHelpers.TryStyle(lblStatus, "BaseTextBlockStyle");
            ThemeHelpers.SetThemeTextBrush(lblStatus);
            Grid.SetRow(lblStatus, 0);
            root.Children.Add(lblStatus);

            var lbl = new TextBlock
            {
                Text = "PlayniteViewer API endpoint:",
                Margin = new Thickness(0, 0, 0, 6),
            };
            ThemeHelpers.TryStyle(lbl, "BaseTextBlockStyle");
            ThemeHelpers.SetThemeTextBrush(lbl);
            Grid.SetRow(lbl, 1);
            root.Children.Add(lbl);

            var txtEndpoint = new TextBox
            {
                Text = initialEndpoint ?? "",
                Margin = new Thickness(0, 0, 0, 12),
            };
            ThemeHelpers.TryStyle(txtEndpoint, "BaseTextBoxStyle");
            Grid.SetRow(txtEndpoint, 2);
            root.Children.Add(txtEndpoint);

            var buttons = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
            };
            var btnSave = new Button
            {
                Content = "Save",
                Width = 90,
                Margin = new Thickness(0, 0, 8, 0),
            };
            var btnPush = new Button
            {
                Content = "Push now",
                Width = 90,
                Margin = new Thickness(0, 0, 8, 0),
            };
            var btnClose = new Button { Content = "Close", Width = 90 };
            ThemeHelpers.TryStyle(btnSave, "BaseButtonStyle");
            ThemeHelpers.TryStyle(btnPush, "BaseButtonStyle");
            ThemeHelpers.TryStyle(btnClose, "BaseButtonStyle");
            btnSave.Click += (s, e) => TrySave(txtEndpoint, onSave);
            btnPush.Click += (s, e) =>
            {
                try
                {
                    onPush?.Invoke();
                }
                catch { }
            };
            btnClose.Click += (s, e) => win.Close();
            buttons.Children.Add(btnSave);
            buttons.Children.Add(btnPush);
            buttons.Children.Add(btnClose);
            Grid.SetRow(buttons, 3);
            root.Children.Add(buttons);

            win.Content = root;

            // 3) Debounced, cancellable health-check ping
            var debounce = new System.Windows.Threading.DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(500),
            };
            CancellationTokenSource pingCts = null;

            debounce.Tick += async (s, e) =>
            {
                debounce.Stop();
                pingCts = await PingAndUpdateAsync(lblStatus, txtEndpoint, pingCts);
            };

            txtEndpoint.TextChanged += (s, e) =>
            {
                debounce.Stop();
                debounce.Start();
            };

            win.Loaded += async (s, e) =>
            {
                pingCts = await PingAndUpdateAsync(lblStatus, txtEndpoint, pingCts);
            };

            win.Closing += (s, e) =>
            {
                try
                {
                    debounce.Stop();
                }
                catch { }
                try
                {
                    pingCts?.Cancel();
                    pingCts?.Dispose();
                }
                catch { }
            };

            win.ShowDialog(); // modal to the Playnite window
        }

        private static void TrySave(TextBox txt, Action<string> onSave)
        {
            try
            {
                var val = (txt.Text ?? "").Trim();
                if (!string.IsNullOrEmpty(val))
                    onSave?.Invoke(val);
            }
            catch { }
        }

        // --- Ping helpers ---
        private static string MakePingUrl(string pushUrl)
        {
            var u = (pushUrl ?? "").Trim().TrimEnd('/');
            if (u.EndsWith("/push", StringComparison.OrdinalIgnoreCase))
                return u.Substring(0, u.Length - "/push".Length) + "/ping";
            return u + "/ping";
        }

        private static async Task<bool> PingAsync(
            string pushUrl,
            int timeoutMs,
            CancellationToken ct
        )
        {
            try
            {
                var pingUrl = MakePingUrl(pushUrl);
                using (var wc = new WebClient())
                using (
                    ct.Register(() =>
                    {
                        try
                        {
                            wc.CancelAsync();
                        }
                        catch { }
                    })
                )
                {
                    var downloadTask = wc.DownloadDataTaskAsync(new Uri(pingUrl));
                    var timeoutTask = Task.Delay(timeoutMs, ct);
                    var completed = await Task.WhenAny(downloadTask, timeoutTask);
                    if (completed != downloadTask)
                    {
                        try
                        {
                            wc.CancelAsync();
                        }
                        catch { }
                        ct.ThrowIfCancellationRequested();
                        return false;
                    }
                    var _ = await downloadTask; // throws if HTTP failed/cancelled
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static async System.Threading.Tasks.Task<System.Threading.CancellationTokenSource> PingAndUpdateAsync(
            System.Windows.Controls.TextBlock lblStatus,
            System.Windows.Controls.TextBox txtEndpoint,
            System.Threading.CancellationTokenSource pingCts
        )
        {
            var url = (txtEndpoint.Text ?? "").Trim();
            if (string.IsNullOrEmpty(url))
            {
                lblStatus.Text = "Health: (no endpoint)";
                ThemeHelpers.SetThemeTextBrush(lblStatus);
                return pingCts;
            }

            try
            {
                pingCts?.Cancel();
                pingCts?.Dispose();
            }
            catch { }
            pingCts = new CancellationTokenSource();

            lblStatus.Text = "Health: checking…";
            ThemeHelpers.SetThemeTextBrush(lblStatus);

            var ok = await PingAsync(url, 1500, pingCts.Token);
            if (!pingCts.IsCancellationRequested)
            {
                lblStatus.Text = ok ? "Health: Connected ✅" : "Health: Offline ❌";

                var applied =
                    (
                        ok
                        && ThemeHelpers.TrySetDynamicBrush(
                            lblStatus,
                            TextBlock.ForegroundProperty,
                            "SuccessBrush"
                        )
                    )
                    || (
                        !ok
                        && ThemeHelpers.TrySetDynamicBrush(
                            lblStatus,
                            TextBlock.ForegroundProperty,
                            "ErrorBrush"
                        )
                    );

                if (!applied)
                {
                    ThemeHelpers.SetThemeTextBrush(lblStatus); // fallback to themed text color
                }
            }

            return pingCts;
        }
    }
}
