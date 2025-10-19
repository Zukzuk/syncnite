using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Shapes;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge
{
    /// <summary>
    /// Builds and shows the settings window for the Syncnite Bridge extension.
    /// </summary>
    public static class SettingsWindowFactory
    {

        /// <summary>
        /// Build and show the settings window.
        /// </summary>
        public static void BuildAndShow(
            IPlayniteAPI api,
            string initialApiBase,
            Func<string> getHealthText,
            Action<Action<bool>> subscribeHealth,
            Action<Action<bool>> unsubscribeHealth,
            Action<string> onSaveApiBase,
            Action onPushInstalled,
            Action onSyncLibrary,
            // NEW:
            string initialEmail,
            string initialPassword,
            Action<string, string> onSaveCredentials
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

            var appVer = BridgeVersion.Current;
            win.Title = AppConstants.SettingsTitle + " (v" + appVer + ")";

            ThemeHelpers.HookThemeBackground(win);
            ThemeHelpers.HookThemeForeground(win);

            var root = new Grid { Margin = new Thickness(16) };
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Header
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Divider
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // API base
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Creds
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Actions
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Footer

            // Divider helper
            UIElement MakeDivider(double mt = 10, double mb = 12)
            {
                var div = new Border
                {
                    Height = 1,
                    Margin = new Thickness(0, mt, 0, mb),
                    Opacity = 0.5,
                };
                if (
                    !ThemeHelpers.TrySetDynamicBrush(div, Border.BackgroundProperty, "BorderBrush")
                    && !ThemeHelpers.TrySetDynamicBrush(div, Border.BackgroundProperty, "TextBrush")
                )
                {
                    div.Background = new SolidColorBrush(Color.FromArgb(64, 255, 255, 255));
                }
                return div;
            }

            // 1) Header with status dot + text
            var header = new Grid { Margin = new Thickness(0, 0, 0, 4) };
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var dot = new Ellipse
            {
                Width = 12,
                Height = 12,
                Margin = new Thickness(0, 0, 8, 0),
                VerticalAlignment = VerticalAlignment.Center,
            };
            var statusText = new TextBlock
            {
                VerticalAlignment = VerticalAlignment.Center,
                FontWeight = FontWeights.SemiBold,
            };
            ThemeHelpers.SetThemeTextBrush(statusText);

            /// <summary>
            /// Render the health status.
            /// </summary>
            void RenderStatus(bool healthy)
            {
                if (healthy)
                {
                    if (
                        !ThemeHelpers.TrySetDynamicBrush(dot, Shape.FillProperty, "SuccessBrush")
                        && !ThemeHelpers.TrySetDynamicBrush(
                            dot,
                            Shape.FillProperty,
                            "CheckmarkBrush"
                        )
                    )
                    {
                        dot.Fill = new SolidColorBrush(Color.FromRgb(0x22, 0xC5, 0x44)); // green
                    }
                    statusText.Text = AppConstants.HealthStatusHealthy;
                }
                else
                {
                    if (
                        !ThemeHelpers.TrySetDynamicBrush(dot, Shape.FillProperty, "ErrorBrush")
                        && !ThemeHelpers.TrySetDynamicBrush(dot, Shape.FillProperty, "WarningBrush")
                    )
                    {
                        dot.Fill = new SolidColorBrush(Color.FromRgb(0xE5, 0x50, 0x35)); // red
                    }
                    statusText.Text = AppConstants.HealthStatusUnreachable;
                }
            }

            // initial status
            var initialHealthy = string.Equals(
                getHealthText?.Invoke(),
                AppConstants.HealthStatusHealthy,
                StringComparison.OrdinalIgnoreCase
            );
            RenderStatus(initialHealthy);

            // live updates
            Action<bool> handler = ok => win.Dispatcher.Invoke(() => RenderStatus(ok));
            subscribeHealth?.Invoke(handler);
            win.Closed += (s, e) =>
            {
                try
                {
                    unsubscribeHealth?.Invoke(handler);
                }
                catch { }
            };

            Grid.SetColumn(dot, 0);
            header.Children.Add(dot);
            Grid.SetColumn(statusText, 1);
            header.Children.Add(statusText);
            Grid.SetRow(header, 0);
            root.Children.Add(header);

            // 2) Divider
            var div = MakeDivider();
            Grid.SetRow(div, 1);
            root.Children.Add(div);

            // 3) API row: label + input + save
            var apiRow = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            apiRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) }); // label
            apiRow.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            ); // input
            apiRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // button

            var apiLabel = new TextBlock
            {
                Text = "API Base URL",
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(apiLabel);
            Grid.SetColumn(apiLabel, 0);
            apiRow.Children.Add(apiLabel);

            var tbApi = new TextBox
            {
                Text = initialApiBase ?? "",
                MinWidth = 420,
                Margin = new Thickness(0, 2, 0, 0),
            };
            Grid.SetColumn(tbApi, 1);
            apiRow.Children.Add(tbApi);

            var btnSaveApi = new Button
            {
                Content = "Save",
                Width = 90,
                Margin = new Thickness(8, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center,
            };
            btnSaveApi.Click += (s, e) => onSaveApiBase?.Invoke(tbApi.Text?.Trim());
            Grid.SetColumn(btnSaveApi, 2);
            apiRow.Children.Add(btnSaveApi);

            Grid.SetRow(apiRow, 2);
            root.Children.Add(apiRow);

            // 4) Credentials group: Email + Password
            var creds = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            creds.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            creds.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            /// <summary>
            /// Make a labeled row.
            /// </summary>
            Grid MakeRow(string label, UIElement input)
            {
                var r = new Grid { Margin = new Thickness(0, 0, 0, 8) };
                r.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });
                r.ColumnDefinitions.Add(
                    new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
                );
                var lb = new TextBlock
                {
                    Text = label,
                    VerticalAlignment = VerticalAlignment.Center,
                };
                ThemeHelpers.SetThemeTextBrush(lb);
                Grid.SetColumn(lb, 0);
                r.Children.Add(lb);
                Grid.SetColumn(input, 1);
                r.Children.Add(input);
                return r;
            }

            var tbEmail = new TextBox
            {
                Text = initialEmail ?? "",
                Margin = new Thickness(0, 2, 0, 0),
            };
            var rowEmail = MakeRow("Admin Email", tbEmail);

            var tbPass = new PasswordBox
            {
                Password = initialPassword ?? "",
                Margin = new Thickness(0, 2, 0, 0),
            };
            var rowPass = MakeRow("Admin Password", tbPass);

            Grid.SetRow(rowEmail, 0);
            creds.Children.Add(rowEmail);
            Grid.SetRow(rowPass, 1);
            creds.Children.Add(rowPass);

            Grid.SetRow(creds, 3);
            root.Children.Add(creds);

            // 5) Actions: Push / Sync
            var actions = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Margin = new Thickness(0, 2, 0, 12),
            };
            var btnPush = new Button
            {
                Content = "Push installed",
                Width = 140,
                Margin = new Thickness(0, 0, 8, 0),
            };
            btnPush.Click += (s, e) => onPushInstalled?.Invoke();
            var btnSync = new Button { Content = "Sync now", Width = 120 };
            btnSync.Click += (s, e) => onSyncLibrary?.Invoke();
            actions.Children.Add(btnPush);
            actions.Children.Add(btnSync);
            Grid.SetRow(actions, 4);
            root.Children.Add(actions);

            // 6) Footer: Save creds + Close
            var footer = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
            };
            var btnSaveCreds = new Button
            {
                Content = "Save",
                Width = 100,
                Margin = new Thickness(0, 0, 8, 0),
            };
            btnSaveCreds.Click += (s, e) =>
            {
                onSaveCredentials?.Invoke(tbEmail.Text?.Trim() ?? "", tbPass.Password ?? "");
                win.Close();
            };
            var btnClose = new Button { Content = "Close", Width = 100 };
            btnClose.Click += (s, e) => win.Close();
            footer.Children.Add(btnSaveCreds);
            footer.Children.Add(btnClose);

            Grid.SetRow(footer, 5);
            root.Children.Add(footer);

            win.Content = root;
            win.SizeToContent = SizeToContent.WidthAndHeight;
            win.ShowDialog();
        }
    }
}
