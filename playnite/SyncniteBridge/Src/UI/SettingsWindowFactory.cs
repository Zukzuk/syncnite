using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.UI
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
            Func<bool> getIsAdmin,
            Action<Action<bool>> subscribeHealth,
            Action<Action<bool>> unsubscribeHealth,
            Action<string> onSaveApiBase,
            Action onPushInstalled,
            Action onSyncLibrary,
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

            win.Title = AppConstants.AppName + " Settings (v" + BridgeVersion.Current + ")";

            ThemeHelpers.HookThemeBackground(win);
            ThemeHelpers.HookThemeForeground(win);

            // shared state for local functions
            bool isHealthy = false;
            TextBox tbApi = null!;
            TextBox tbEmail = null!;
            PasswordBox tbPass = null!;
            Button btnPush = null!;
            Button btnSync = null!;
            TextBlock roleText = null!;

            var root = new Grid { Margin = new Thickness(16) };
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Header
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Divider
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // API base
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Creds
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Form save
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Action
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Action
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
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // dot
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // status
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // role

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

            roleText = new TextBlock
            {
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(8, 0, 0, 0),
                FontStyle = FontStyles.Italic,
            };
            ThemeHelpers.SetThemeTextBrush(roleText);

            void RenderStatus(bool healthy)
            {
                isHealthy = healthy;

                // Ask health service for the current text so we can detect mismatch.
                var text = getHealthText?.Invoke() ?? AppConstants.HealthStatusUnreachable;

                var isHealthyText = string.Equals(
                    text,
                    AppConstants.HealthStatusHealthy,
                    StringComparison.OrdinalIgnoreCase
                );

                var isVersionMismatch = text.StartsWith(
                    AppConstants.HealthStatusVersionMismatch,
                    StringComparison.OrdinalIgnoreCase
                );

                if (isHealthyText && healthy)
                {
                    // Green – fully healthy
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
                }
                else if (isVersionMismatch)
                {
                    // Orange – reachable but version mismatch
                    if (!ThemeHelpers.TrySetDynamicBrush(dot, Shape.FillProperty, "WarningBrush"))
                    {
                        dot.Fill = new SolidColorBrush(Color.FromRgb(0xF9, 0xA8, 0x25)); // orange-ish
                    }
                }
                else
                {
                    // Red – unreachable / other hard failure
                    if (
                        !ThemeHelpers.TrySetDynamicBrush(dot, Shape.FillProperty, "ErrorBrush")
                        && !ThemeHelpers.TrySetDynamicBrush(dot, Shape.FillProperty, "WarningBrush")
                    )
                    {
                        dot.Fill = new SolidColorBrush(Color.FromRgb(0xE5, 0x50, 0x35)); // red
                    }
                }

                statusText.Text = text;

                try
                {
                    // Only show role if we're actually reachable (healthy or mismatch).
                    if (isHealthyText || isVersionMismatch)
                    {
                        var isAdminNow = getIsAdmin?.Invoke() == true;
                        roleText.Text = isAdminNow ? "admin" : "user";
                        roleText.Visibility = Visibility.Visible;
                    }
                    else
                    {
                        roleText.Text = "";
                        roleText.Visibility = Visibility.Collapsed;
                    }
                }
                catch
                {
                    roleText.Text = "";
                    roleText.Visibility = Visibility.Collapsed;
                }
            }

            Grid.SetColumn(dot, 0);
            header.Children.Add(dot);

            Grid.SetColumn(statusText, 1);
            header.Children.Add(statusText);

            Grid.SetColumn(roleText, 2);
            header.Children.Add(roleText);

            Grid.SetRow(header, 0);
            root.Children.Add(header);

            // 2) Divider
            var div = MakeDivider();
            Grid.SetRow(div, 1);
            root.Children.Add(div);

            // 3) API row: label + input (no button here; saving is below)
            var apiRow = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            apiRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) }); // label
            apiRow.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            ); // input

            var apiLabel = new TextBlock
            {
                Text = "API Base URL",
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(apiLabel);
            Grid.SetColumn(apiLabel, 0);
            apiRow.Children.Add(apiLabel);

            tbApi = new TextBox
            {
                Text = initialApiBase ?? "",
                MinWidth = 420,
                Margin = new Thickness(0, 2, 0, 0),
            };
            Grid.SetColumn(tbApi, 1);
            apiRow.Children.Add(tbApi);

            Grid.SetRow(apiRow, 2);
            root.Children.Add(apiRow);

            // 4) Credentials group: Email + Password
            var creds = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            creds.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            creds.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

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

            tbEmail = new TextBox { Text = initialEmail ?? "", Margin = new Thickness(0, 2, 0, 0) };
            var rowEmail = MakeRow("Admin Email", tbEmail);

            tbPass = new PasswordBox
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

            // helper: save full form (API + creds)
            void SaveAll()
            {
                onSaveApiBase?.Invoke(tbApi.Text?.Trim() ?? "");
                onSaveCredentials?.Invoke(tbEmail.Text?.Trim() ?? "", tbPass.Password ?? "");
            }

            // helper: enable / disable action buttons
            void RefreshActionButtons()
            {
                if (
                    btnPush == null
                    || btnSync == null
                    || tbApi == null
                    || tbEmail == null
                    || tbPass == null
                )
                    return;

                var hasUrl = !string.IsNullOrWhiteSpace(tbApi.Text);
                var hasEmail = !string.IsNullOrWhiteSpace(tbEmail.Text);
                var hasPass = !string.IsNullOrWhiteSpace(tbPass.Password);

                var enabledByHealthAndForm = isHealthy && hasUrl && hasEmail && hasPass;

                // Try to determine current role
                var isAdminNow = false;
                try
                {
                    isAdminNow = getIsAdmin?.Invoke() == true;
                }
                catch
                {
                    isAdminNow = false;
                }

                // Push installed is allowed for both roles
                btnPush.IsEnabled = enabledByHealthAndForm;

                // Full library sync should only be possible as admin
                btnSync.IsEnabled = enabledByHealthAndForm && isAdminNow;
            }

            // refresh actions when user edits fields
            tbApi.TextChanged += (s, e) => RefreshActionButtons();
            tbEmail.TextChanged += (s, e) => RefreshActionButtons();
            tbPass.PasswordChanged += (s, e) => RefreshActionButtons();

            // 5) Form Save button (does NOT close window)
            var formSavePanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
                Margin = new Thickness(0, 0, 0, 12),
            };

            var btnSaveForm = new Button { Content = "Save", Width = 100 };
            btnSaveForm.Click += (s, e) => SaveAll();

            formSavePanel.Children.Add(btnSaveForm);

            Grid.SetRow(formSavePanel, 4);
            root.Children.Add(formSavePanel);

            // 6) Actions: Push / Sync with descriptions
            var action1 = new Grid { Margin = new Thickness(0, 2, 0, 12) };
            action1.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );
            var action2 = new Grid { Margin = new Thickness(0, 2, 0, 12) };
            action2.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );

            // Push installed
            var pushPanel = new StackPanel { Orientation = Orientation.Horizontal };

            btnPush = new Button
            {
                Content = "Push installed",
                Width = 120,
                Margin = new Thickness(0, 0, 12, 0),
            };
            btnPush.Click += (s, e) => onPushInstalled?.Invoke();

            var pushText = new TextBlock
            {
                Text = "Push list of installed games.",
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 8, 0, 0),
            };
            ThemeHelpers.SetThemeTextBrush(pushText);

            pushPanel.Children.Add(btnPush);
            pushPanel.Children.Add(pushText);
            Grid.SetColumn(pushPanel, 0);
            action1.Children.Add(pushPanel);

            Grid.SetRow(action1, 5);
            root.Children.Add(action1);

            // Sync library
            var syncPanel = new StackPanel { Orientation = Orientation.Horizontal };

            btnSync = new Button
            {
                Content = "Sync library",
                Width = 120,
                Margin = new Thickness(0, 0, 12, 0),
            };
            btnSync.Click += (s, e) =>
            {
                var isAdminNow = false;
                try
                {
                    isAdminNow = getIsAdmin?.Invoke() == true;
                }
                catch
                {
                    isAdminNow = false;
                }

                if (!isAdminNow)
                {
                    api.Dialogs.ShowMessage(
                        "You need to be logged in as an admin to run a full library sync.",
                        AppConstants.AppName + " – Admin required"
                    );
                    return;
                }

                onSyncLibrary?.Invoke();
            };

            var syncText = new TextBlock
            {
                Text = "Run a full library sync and re-upload media.",
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 8, 0, 0),
            };
            ThemeHelpers.SetThemeTextBrush(syncText);

            syncPanel.Children.Add(btnSync);
            syncPanel.Children.Add(syncText);
            Grid.SetColumn(syncPanel, 1);
            action2.Children.Add(syncPanel);

            Grid.SetRow(action2, 6);
            root.Children.Add(action2);

            // 7) Footer: Save & Close / Cancel
            var footer = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
            };

            var btnSaveAndClose = new Button
            {
                Content = "Save and close",
                Width = 120,
                Margin = new Thickness(0, 0, 8, 0),
            };
            btnSaveAndClose.Click += (s, e) =>
            {
                SaveAll();
                win.Close();
            };

            var btnCancel = new Button { Content = "Cancel", Width = 100 };
            btnCancel.Click += (s, e) => win.Close();

            footer.Children.Add(btnSaveAndClose);
            footer.Children.Add(btnCancel);

            Grid.SetRow(footer, 7);
            root.Children.Add(footer);

            // initial health + live updates (after controls created so we can toggle buttons)
            var initialHealthy = string.Equals(
                getHealthText?.Invoke(),
                AppConstants.HealthStatusHealthy,
                StringComparison.OrdinalIgnoreCase
            );
            RenderStatus(initialHealthy);
            RefreshActionButtons();

            Action<bool> handler = ok =>
                win.Dispatcher.Invoke(() =>
                {
                    RenderStatus(ok);
                    RefreshActionButtons();
                });
            subscribeHealth?.Invoke(handler);
            win.Closed += (s, e) =>
            {
                try
                {
                    unsubscribeHealth?.Invoke(handler);
                }
                catch { }
            };

            win.Content = root;
            win.SizeToContent = SizeToContent.WidthAndHeight;
            win.ShowDialog();
        }
    }
}
