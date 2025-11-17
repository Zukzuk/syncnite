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
        /// <param name="api">Playnite API instance.</param>
        /// <param name="initialApiBase">Initial API base URL.</param>
        /// <param name="getHealthText">Returns the current health text.</param>
        /// <param name="getIsAdmin">Returns true if the current session is admin.</param>
        /// <param name="subscribeHealth">Subscribe to health changes (bool healthy).</param>
        /// <param name="unsubscribeHealth">Unsubscribe health handler.</param>
        /// <param name="onSaveApiBase">Callback when API base is saved.</param>
        /// <param name="onPushInstalled">Callback to push installed games.</param>
        /// <param name="onSyncLibrary">Callback to sync library.</param>
        /// <param name="initialEmail">Initial email value.</param>
        /// <param name="initialPassword">Initial password value.</param>
        /// <param name="isAdminInstall">
        /// True when this Playnite installation is the bound admin install.
        /// </param>
        /// <param name="onSaveCredentials">
        /// Callback when credentials are saved (email, password).
        /// </param>
        /// <param name="onReleaseAdmin">
        /// Callback when the user confirms "Release admin" in the UI.
        /// Should call the API to delete/release the admin account and
        /// reset local state (config, headers, etc.).
        /// </param>
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
            bool isAdminInstall,
            Action<string, string> onSaveCredentials,
            Action onReleaseAdmin
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

            bool isHealthy = false;

            TextBox tbApi = null!;
            TextBox tbEmail = null!;
            PasswordBox tbPass = null!;
            Button btnPush = null!;
            Button btnSync = null!;
            Button btnSave = null!;
            Button btnReleaseAdmin = null!;
            TextBlock roleText = null!;
            TextBlock loginLockedInfo = null!;
            Ellipse statusDot = null!;
            TextBlock statusText = null!;

            var root = new Grid { Margin = new Thickness(16) };
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Header
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Divider
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // API base
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Creds
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Save row
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Action 1
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Action 2
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Footer

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
                    div.Background = new SolidColorBrush(Color.FromRgb(120, 120, 120));
                }

                return div;
            }

            // HEADER
            var header = new Grid { Margin = new Thickness(0, 0, 0, 8) };
            header.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            ); // title
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // status
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // role

            var title = new TextBlock
            {
                Text = AppConstants.AppName + " Settings",
                FontSize = 18,
                FontWeight = FontWeights.Bold,
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(title);
            Grid.SetColumn(title, 0);
            header.Children.Add(title);

            var statusPanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(8, 0, 16, 0),
            };

            statusDot = new Ellipse
            {
                Width = 10,
                Height = 10,
                Margin = new Thickness(0, 0, 6, 0),
                Fill = new SolidColorBrush(Color.FromRgb(140, 140, 140)),
            };

            statusText = new TextBlock
            {
                Text = AppConstants.HealthStatusUnreachable,
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(statusText);

            statusPanel.Children.Add(statusDot);
            statusPanel.Children.Add(statusText);
            Grid.SetColumn(statusPanel, 1);
            header.Children.Add(statusPanel);

            roleText = new TextBlock
            {
                Text = "(role unknown)",
                VerticalAlignment = VerticalAlignment.Center,
                FontStyle = FontStyles.Italic,
            };
            ThemeHelpers.SetThemeTextBrush(roleText);
            Grid.SetColumn(roleText, 2);
            header.Children.Add(roleText);

            Grid.SetRow(header, 0);
            root.Children.Add(header);

            // DIVIDER
            var div = MakeDivider();
            Grid.SetRow(div, 1);
            root.Children.Add(div);

            // API ROW
            var apiRow = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            apiRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });
            apiRow.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );

            var apiLabel = new TextBlock
            {
                Text = "API Base URL",
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(apiLabel);
            Grid.SetColumn(apiLabel, 0);
            apiRow.Children.Add(apiLabel);

            tbApi = new TextBox { Text = initialApiBase ?? "" };
            ThemeHelpers.SetThemeTextBrush(tbApi);
            Grid.SetColumn(tbApi, 1);
            apiRow.Children.Add(tbApi);

            Grid.SetRow(apiRow, 2);
            root.Children.Add(apiRow);

            // CREDS ROW
            var credsRow = new Grid { Margin = new Thickness(0, 0, 0, 6) };
            credsRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });
            credsRow.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );
            credsRow.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // email
            credsRow.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // pass

            var emailLabel = new TextBlock
            {
                Text = "Email",
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(emailLabel);
            Grid.SetRow(emailLabel, 0);
            Grid.SetColumn(emailLabel, 0);
            credsRow.Children.Add(emailLabel);

            tbEmail = new TextBox { Text = initialEmail ?? "", Margin = new Thickness(0, 0, 0, 4) };
            ThemeHelpers.SetThemeTextBrush(tbEmail);
            Grid.SetRow(tbEmail, 0);
            Grid.SetColumn(tbEmail, 1);
            credsRow.Children.Add(tbEmail);

            var passLabel = new TextBlock
            {
                Text = "Password",
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(passLabel);
            Grid.SetRow(passLabel, 1);
            Grid.SetColumn(passLabel, 0);
            credsRow.Children.Add(passLabel);

            tbPass = new PasswordBox { Margin = new Thickness(0, 0, 0, 0) };
            if (!string.IsNullOrEmpty(initialPassword))
                tbPass.Password = initialPassword;
            Grid.SetRow(tbPass, 1);
            Grid.SetColumn(tbPass, 1);
            credsRow.Children.Add(tbPass);

            Grid.SetRow(credsRow, 3);
            root.Children.Add(credsRow);

            // INFO under creds (lock explanation)
            loginLockedInfo = new TextBlock
            {
                Margin = new Thickness(150, 4, 0, 0),
                FontStyle = FontStyles.Italic,
                TextWrapping = TextWrapping.Wrap,
                Visibility = Visibility.Collapsed,
                Text =
                    "Admin login is locked to this installation. "
                    + "You can change the password, but not the email.",
            };
            ThemeHelpers.SetThemeTextBrush(loginLockedInfo);
            Grid.SetRow(loginLockedInfo, 3);
            root.Children.Add(loginLockedInfo);

            // SAVE + RELEASE ROW
            var saveRow = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Left,
                Margin = new Thickness(150, 10, 0, 10),
            };

            btnSave = new Button
            {
                Content = "Save settings",
                Width = 120,
                Margin = new Thickness(0, 0, 12, 0),
            };
            saveRow.Children.Add(btnSave);

            btnReleaseAdmin = new Button
            {
                Content = "Release admin",
                Width = 130,
                Margin = new Thickness(0, 0, 0, 0),
                Visibility = Visibility.Collapsed, // shown only when admin
            };
            saveRow.Children.Add(btnReleaseAdmin);

            Grid.SetRow(saveRow, 4);
            root.Children.Add(saveRow);

            // ACTION: Push installed
            var action1 = new Grid { Margin = new Thickness(0, 10, 0, 4) };
            action1.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            action1.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );

            var pushPanel = new StackPanel { Orientation = Orientation.Horizontal };

            btnPush = new Button
            {
                Content = "Push installed",
                Width = 120,
                Margin = new Thickness(0, 0, 12, 0),
            };
            pushPanel.Children.Add(btnPush);

            var pushText = new TextBlock
            {
                Text = "Push list of installed games.",
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 8, 0, 0),
            };
            ThemeHelpers.SetThemeTextBrush(pushText);
            pushPanel.Children.Add(pushText);

            Grid.SetColumn(pushPanel, 0);
            action1.Children.Add(pushPanel);
            Grid.SetRow(action1, 5);
            root.Children.Add(action1);

            // ACTION: Sync library
            var action2 = new Grid { Margin = new Thickness(0, 4, 0, 10) };
            action2.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            action2.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );

            var syncPanel = new StackPanel { Orientation = Orientation.Horizontal };

            btnSync = new Button
            {
                Content = "Sync library",
                Width = 120,
                Margin = new Thickness(0, 0, 12, 0),
            };
            syncPanel.Children.Add(btnSync);

            var syncText = new TextBlock
            {
                Text = "Synchronize the game library with the Syncnite service.",
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 8, 0, 0),
            };
            ThemeHelpers.SetThemeTextBrush(syncText);
            syncPanel.Children.Add(syncText);

            Grid.SetColumn(syncPanel, 0);
            action2.Children.Add(syncPanel);
            Grid.SetRow(action2, 6);
            root.Children.Add(action2);

            // FOOTER
            var footer = new TextBlock
            {
                Margin = new Thickness(0, 8, 0, 0),
                TextWrapping = TextWrapping.Wrap,
                Text = "Changes are applied when you press 'Save settings'.",
                FontSize = 11,
            };
            ThemeHelpers.SetThemeTextBrush(footer);
            Grid.SetRow(footer, 7);
            root.Children.Add(footer);

            // ---- LOCAL HELPERS ----

            void ApplyLoginLockState()
            {
                if (isAdminInstall)
                {
                    // Email is locked; password can still change
                    tbEmail.IsReadOnly = true;
                    tbEmail.Opacity = 0.7;
                    tbEmail.ToolTip = "Admin login is locked to this installation.";

                    tbPass.IsEnabled = true;
                    tbPass.Opacity = 1.0;
                    tbPass.ToolTip = "Update the admin password if it changed on the server.";

                    loginLockedInfo.Visibility = Visibility.Visible;
                }
                else
                {
                    tbEmail.IsReadOnly = false;
                    tbEmail.Opacity = 1.0;
                    tbEmail.ToolTip = null;

                    tbPass.IsEnabled = true;
                    tbPass.Opacity = 1.0;
                    tbPass.ToolTip = null;

                    loginLockedInfo.Visibility = Visibility.Collapsed;
                }
            }

            void SaveAll()
            {
                onSaveApiBase?.Invoke(tbApi.Text?.Trim() ?? "");

                // When this install is locked as admin, we don't persist changed creds via the form.
                if (!isAdminInstall)
                {
                    onSaveCredentials?.Invoke(tbEmail.Text?.Trim() ?? "", tbPass.Password ?? "");
                }
            }

            void RefreshRoleAndAdminControls()
            {
                var isAdminNow = false;
                try
                {
                    isAdminNow = getIsAdmin?.Invoke() == true;
                }
                catch { }

                roleText.Text = isAdminNow ? "(admin)" : "(user)";

                btnReleaseAdmin.Visibility =
                    (isAdminInstall && isAdminNow) ? Visibility.Visible : Visibility.Collapsed;
            }

            void RefreshActionButtons()
            {
                if (
                    btnPush == null
                    || btnSync == null
                    || tbApi == null
                    || tbEmail == null
                    || tbPass == null
                )
                {
                    return;
                }

                var hasUrl = !string.IsNullOrWhiteSpace(tbApi.Text);
                var hasEmail = !string.IsNullOrWhiteSpace(tbEmail.Text);
                var hasPass = !string.IsNullOrWhiteSpace(tbPass.Password);

                // When this install is locked to admin, we trust stored creds even if fields are readonly.
                var formOk = hasUrl && (isAdminInstall || (hasEmail && hasPass));

                var isAdminNow = false;
                try
                {
                    isAdminNow = getIsAdmin?.Invoke() == true;
                }
                catch { }

                btnPush.IsEnabled = isHealthy && formOk;
                btnSync.IsEnabled = isHealthy && formOk && isAdminNow;
            }

            void RenderStatus(bool healthy)
            {
                isHealthy = healthy;

                var text = getHealthText?.Invoke() ?? AppConstants.HealthStatusUnreachable;
                statusText.Text = text;

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
                    if (
                        !ThemeHelpers.TrySetDynamicBrush(
                            statusDot,
                            Shape.FillProperty,
                            "SuccessBrush"
                        )
                    )
                    {
                        statusDot.Fill = new SolidColorBrush(Color.FromRgb(0, 180, 0));
                    }
                }
                else if (isVersionMismatch)
                {
                    if (
                        !ThemeHelpers.TrySetDynamicBrush(
                            statusDot,
                            Shape.FillProperty,
                            "WarningBrush"
                        )
                    )
                    {
                        statusDot.Fill = new SolidColorBrush(Color.FromRgb(220, 160, 0));
                    }
                }
                else
                {
                    if (
                        !ThemeHelpers.TrySetDynamicBrush(
                            statusDot,
                            Shape.FillProperty,
                            "ErrorBrush"
                        )
                    )
                    {
                        statusDot.Fill = new SolidColorBrush(Color.FromRgb(200, 0, 0));
                    }
                }

                RefreshActionButtons();
            }

            // ---- WIRING ----

            tbApi.TextChanged += (s, e) => RefreshActionButtons();
            tbEmail.TextChanged += (s, e) => RefreshActionButtons();
            tbPass.PasswordChanged += (s, e) => RefreshActionButtons();

            btnSave.Click += (s, e) =>
            {
                SaveAll();
                RefreshActionButtons();
            };

            btnPush.Click += (s, e) => onPushInstalled?.Invoke();
            btnSync.Click += (s, e) => onSyncLibrary?.Invoke();

            btnReleaseAdmin.Click += (s, e) =>
            {
                var isAdminNow = false;
                try
                {
                    isAdminNow = getIsAdmin?.Invoke() == true;
                }
                catch { }

                if (!isAdminNow)
                {
                    api.Dialogs.ShowMessage(
                        "You are not currently logged in as admin.",
                        AppConstants.AppName
                    );
                    return;
                }

                var message =
                    "This will release the admin account for this Syncnite server.\n\n"
                    + "- The admin account on the server will be removed.\n"
                    + "- This Playnite installation will no longer be the admin install.\n"
                    + "- You will need to register a new admin from some installation.\n\n"
                    + "Are you sure you want to continue?";

                var result = api.Dialogs.ShowMessage(
                    message,
                    "Release admin?",
                    MessageBoxButton.YesNo
                );

                if (result != MessageBoxResult.Yes)
                    return;

                onReleaseAdmin?.Invoke();

                // After release, it's usually safest to close the window.
                win.Close();
            };

            // Initial state
            ApplyLoginLockState();

            var initialHealthText = getHealthText?.Invoke() ?? AppConstants.HealthStatusUnreachable;
            var initialHealthy = string.Equals(
                initialHealthText,
                AppConstants.HealthStatusHealthy,
                StringComparison.OrdinalIgnoreCase
            );
            RenderStatus(initialHealthy);
            RefreshRoleAndAdminControls();
            RefreshActionButtons();

            Action<bool> handler = ok =>
                win.Dispatcher.Invoke(() =>
                {
                    RenderStatus(ok);
                    RefreshRoleAndAdminControls();
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
