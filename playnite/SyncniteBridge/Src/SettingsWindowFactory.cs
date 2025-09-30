using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Shapes;
using Playnite.SDK;
using SyncniteBridge.Helpers;

namespace SyncniteBridge
{
    public static class SettingsWindowFactory
    {
        public static void BuildAndShow(
            IPlayniteAPI api,
            string initialApiBase,
            Func<string> getHealthText,
            Action<Action<bool>> subscribeHealth,
            Action<Action<bool>> unsubscribeHealth,
            Action<string> onSaveApiBase,
            Action onPushInstalled,
            Action onSyncLibrary
        )
        {
            var win = api.Dialogs.CreateWindow(
                new WindowCreationOptions
                {
                    ShowCloseButton = true,
                    ShowMaximizeButton = false,
                    ShowMinimizeButton = false,
                }
            );

            // Title (exact text as requested)
            var appVer = BridgeVersion.Current;
            win.Title = "Syncnite Bridge Settings (v" + appVer + ")";

            // Hook Playnite theme background/foreground
            ThemeHelpers.HookThemeBackground(win);
            ThemeHelpers.HookThemeForeground(win);

            var root = new Grid { Margin = new Thickness(14) };
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Intro
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Divider
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Server status
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // API row
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Push row
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Sync row
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Footer

            // Divider helper
            UIElement MakeDivider(double marginTop = 8, double marginBottom = 8)
            {
                var div = new Border
                {
                    Height = 1,
                    Margin = new Thickness(0, marginTop, 0, marginBottom),
                    Opacity = 0.5,
                };
                // Try to pull a subtle divider brush from theme; fallback to foreground with low opacity.
                if (!ThemeHelpers.TrySetDynamicBrush(div, Border.BackgroundProperty, "BorderBrush"))
                {
                    if (
                        !ThemeHelpers.TrySetDynamicBrush(
                            div,
                            Border.BackgroundProperty,
                            "TextBrush"
                        )
                    )
                    {
                        div.Background = new SolidColorBrush(Color.FromArgb(64, 255, 255, 255));
                    }
                }
                return div;
            }

            // --- Pithy intro text ---
            var intro = new TextBlock
            {
                Text = "Configure the server endpoint and run manual syncs when needed.",
                Margin = new Thickness(0, 0, 0, 8),
                TextWrapping = TextWrapping.Wrap,
            };
            ThemeHelpers.SetThemeTextBrush(intro);
            Grid.SetRow(intro, 0);
            root.Children.Add(intro);

            // --- divider ---
            var div = MakeDivider(0, 10);
            Grid.SetRow(div, 1);
            root.Children.Add(div);

            // --- 1) Server status: green / red dot ---
            var statusPanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Margin = new Thickness(0, 0, 0, 8),
                VerticalAlignment = VerticalAlignment.Center,
            };

            var statusLabel = new TextBlock
            {
                Text = "Server status:",
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(statusLabel);
            statusPanel.Children.Add(statusLabel);

            var dot = new Ellipse
            {
                Width = 10,
                Height = 10,
                Margin = new Thickness(8, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center,
            };
            statusPanel.Children.Add(dot);

            var statusText = new TextBlock
            {
                Margin = new Thickness(6, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(statusText);
            statusPanel.Children.Add(statusText);

            Grid.SetRow(statusPanel, 2);
            root.Children.Add(statusPanel);

            // helper to (re)render current state
            void RenderStatus(bool healthy)
            {
                var applied = false;
                if (healthy)
                {
                    applied =
                        ThemeHelpers.TrySetDynamicBrush(dot, Shape.FillProperty, "SuccessBrush")
                        || ThemeHelpers.TrySetDynamicBrush(
                            dot,
                            Shape.FillProperty,
                            "CheckmarkBrush"
                        )
                        || ThemeHelpers.TrySetDynamicBrush(dot, Shape.FillProperty, "AccentBrush");
                    if (!applied)
                        dot.Fill = new SolidColorBrush(Color.FromRgb(0x22, 0xC5, 0x44));
                    statusText.Text = "healthy";
                }
                else
                {
                    applied =
                        ThemeHelpers.TrySetDynamicBrush(dot, Shape.FillProperty, "ErrorBrush")
                        || ThemeHelpers.TrySetDynamicBrush(dot, Shape.FillProperty, "WarningBrush");
                    if (!applied)
                        dot.Fill = new SolidColorBrush(Color.FromRgb(0xE5, 0x50, 0x35));
                    statusText.Text = "unreachable";
                }
            }

            // initial paint
            var isHealthy = string.Equals(
                getHealthText?.Invoke(),
                "healthy",
                StringComparison.OrdinalIgnoreCase
            );
            RenderStatus(isHealthy);

            // subscribe to live updates
            Action<bool> handler = ok =>
            {
                // marshal to UI thread
                win.Dispatcher.Invoke(() => RenderStatus(ok));
            };
            subscribeHealth?.Invoke(handler);

            // ensure we detach when window closes
            win.Closed += (s, e) =>
            {
                try
                {
                    unsubscribeHealth?.Invoke(handler);
                }
                catch { }
            };

            // --- 2) API endpoint: "API: [input] {Save}" ---
            var apiRow = new Grid { Margin = new Thickness(0, 0, 0, 8) };
            apiRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // label
            apiRow.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            ); // input
            apiRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // button

            var apiLabel = new TextBlock
            {
                Text = "API:",
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 8, 0),
            };
            ThemeHelpers.SetThemeTextBrush(apiLabel);
            Grid.SetColumn(apiLabel, 0);
            apiRow.Children.Add(apiLabel);

            var tbApi = new TextBox
            {
                Text = initialApiBase,
                MinWidth = 420,
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(tbApi);
            Grid.SetColumn(tbApi, 1);
            apiRow.Children.Add(tbApi);

            var btnSave = new Button
            {
                Content = "Save",
                Width = 84,
                Margin = new Thickness(8, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center,
            };
            btnSave.Click += (s, e) =>
            {
                onSaveApiBase?.Invoke(tbApi.Text?.Trim());
            };
            Grid.SetColumn(btnSave, 2);
            apiRow.Children.Add(btnSave);

            // UX: Enter to save
            tbApi.KeyDown += (s, e) =>
            {
                if (e.Key == Key.Enter)
                {
                    btnSave.RaiseEvent(new RoutedEventArgs(Button.ClickEvent));
                    e.Handled = true;
                }
            };

            Grid.SetRow(apiRow, 3);
            root.Children.Add(apiRow);

            // --- 3) Push installed row ---
            var pushRow = new Grid { Margin = new Thickness(0, 0, 0, 8) };
            pushRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            pushRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var pushLabel = new TextBlock
            {
                Text = "Update installed games manually:",
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 8, 0),
            };
            ThemeHelpers.SetThemeTextBrush(pushLabel);
            Grid.SetColumn(pushLabel, 0);
            pushRow.Children.Add(pushLabel);

            var btnPush = new Button
            {
                Content = "Update",
                Width = 120,
                VerticalAlignment = VerticalAlignment.Center,
            };
            btnPush.Click += (s, e) => onPushInstalled?.Invoke();
            Grid.SetColumn(btnPush, 1);
            pushRow.Children.Add(btnPush);

            Grid.SetRow(pushRow, 4);
            root.Children.Add(pushRow);

            // --- 4) Sync library row ---
            var syncRow = new Grid { Margin = new Thickness(0, 0, 0, 8) };
            syncRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            syncRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var syncLabel = new TextBlock
            {
                Text = "Sync library manually:",
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 8, 0),
            };
            ThemeHelpers.SetThemeTextBrush(syncLabel);
            Grid.SetColumn(syncLabel, 0);
            syncRow.Children.Add(syncLabel);

            var btnSync = new Button
            {
                Content = "Sync",
                Width = 120,
                VerticalAlignment = VerticalAlignment.Center,
            };
            btnSync.Click += (s, e) => onSyncLibrary?.Invoke();
            Grid.SetColumn(btnSync, 1);
            syncRow.Children.Add(btnSync);

            Grid.SetRow(syncRow, 5);
            root.Children.Add(syncRow);

            // --- 5) Footer: Close button right-aligned ---
            var footer = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
            };
            var btnClose = new Button { Content = "Close", Width = 100 };
            btnClose.Click += (s, e) => win.Close();
            footer.Children.Add(btnClose);

            Grid.SetRow(footer, 6);
            root.Children.Add(footer);

            win.Content = root;
            win.SizeToContent = SizeToContent.WidthAndHeight;
            win.ShowDialog();
        }
    }
}
