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
        /// <param name="onForceSyncLibrary">Callback to force sync full library.</param>
        /// <param name="initialEmail">Initial email value.</param>
        /// <param name="initialPassword">Initial password value.</param>
        /// <param name="clientId">ClientId hash string to display.</param>
        /// <param name="isAdminInstall">True when this Playnite installation is the bound admin install.</param>
        /// <param name="onSaveCredentials">Callback when credentials are saved (email, password).</param>
        /// <param name="onReleaseAdmin">
        /// Callback when the user confirms "Release admin" in the UI.
        /// Should call the API to delete/release the admin account and reset local state.
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
            Action onForceSyncLibrary,
            string initialEmail,
            string initialPassword,
            string clientId,
            bool isAdminInstall,
            Action<string, string> onSaveCredentials,
            Action onReleaseAdmin
        )
        {
            var ctx = new SettingsWindow(api);
            var win = ctx.Window;

            // Center manually when the window has been laid out
            win.Loaded += (_, __) =>
            {
                var main = Application.Current?.MainWindow;
                if (main == null)
                {
                    win.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                    return;
                }

                // If Width/Height are Auto, force measure first
                win.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
                win.Arrange(new Rect(win.DesiredSize));

                var width = double.IsNaN(win.Width) || win.Width == 0 ? win.ActualWidth : win.Width;
                var height =
                    double.IsNaN(win.Height) || win.Height == 0 ? win.ActualHeight : win.Height;

                if (width <= 0 || height <= 0)
                {
                    win.WindowStartupLocation = WindowStartupLocation.CenterOwner;
                    return;
                }

                var left = main.Left + (main.ActualWidth - width) / 2;
                var top = main.Top + (main.ActualHeight - height) / 2;

                win.Left = Math.Max(left, 0);
                win.Top = Math.Max(top, 0);
            };
            ThemeHelpers.HookThemeBackground(win);
            ThemeHelpers.HookThemeForeground(win);

            bool isHealthy = false;
            bool versionWarningShown = false;

            var lockedEmail = initialEmail ?? "";

            var root = ctx.RootGrid;

            UIElement MakeDivider(double mt = 16, double mb = 16)
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

            // Window title
            win.Title = AppConstants.AppName + " Settings";

            // Header row: status, role, version, client id
            SettingsHeaderBuilder.BuildHeaderRow(ctx, clientId);

            // Divider between header and form
            var div = MakeDivider();
            Grid.SetRow(div, 1);
            root.Children.Add(div);

            // Form (API/credentials + save/admin row)
            SettingsFormBuilder.BuildForm(
                ctx,
                initialApiBase,
                initialEmail,
                initialPassword,
                isAdminInstall
            );

            // Divider between form and manual actions (row 6)
            div = MakeDivider();
            Grid.SetRow(div, 6);
            root.Children.Add(div);

            // Manual buttons (rows 7-8)
            SettingsManualActionsBuilder.BuildManualActions(ctx);

            // Divider between manual actions and window buttons (row 9)
            div = MakeDivider();
            Grid.SetRow(div, 9);
            root.Children.Add(div);

            // Bottom window buttons (row 10)
            SettingsWindowButtonsBuilder.BuildWindowButtons(ctx);

            // Local helpers
            void ApplyLoginLockState()
            {
                if (isAdminInstall)
                {
                    if (!string.IsNullOrWhiteSpace(lockedEmail))
                    {
                        ctx.TbEmail.Text = lockedEmail + " (admin-locked)";
                    }
                    else
                    {
                        ctx.TbEmail.Text = "Admin (admin-locked)";
                    }

                    ctx.TbEmail.IsReadOnly = true;
                    ctx.TbEmail.Opacity = 0.7;
                    ctx.TbEmail.ToolTip = "Admin is locked, click 'Release admin' to change";
                    ctx.TbPass.IsEnabled = true;
                    ctx.TbPass.Opacity = 1.0;
                    ctx.TbPass.ToolTip = "Update the admin password if it changed on the server";
                }
                else
                {
                    ctx.TbEmail.IsReadOnly = false;
                    ctx.TbEmail.Opacity = 1.0;
                    ctx.TbEmail.ToolTip = "username";
                    ctx.TbEmail.Text = initialEmail ?? string.Empty;
                    ctx.TbPass.IsEnabled = true;
                    ctx.TbPass.Opacity = 1.0;
                    ctx.TbPass.ToolTip = null;
                }
            }

            void SaveAll()
            {
                onSaveApiBase?.Invoke(ctx.TbApi.Text?.Trim() ?? string.Empty);

                var password = ctx.TbPass.Password ?? string.Empty;
                if (isAdminInstall)
                {
                    onSaveCredentials?.Invoke(lockedEmail, password);
                }
                else
                {
                    var email = ctx.TbEmail.Text?.Trim() ?? string.Empty;
                    onSaveCredentials?.Invoke(email, password);
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

                ctx.RoleText.Text = isAdminNow ? "(admin)" : "(user)";

                ctx.BtnReleaseAdmin.Visibility =
                    (isAdminInstall && isAdminNow) ? Visibility.Visible : Visibility.Collapsed;
                ctx.ForcePanel.Visibility = isAdminNow ? Visibility.Visible : Visibility.Collapsed;
            }

            void RefreshActionButtons()
            {
                var hasUrl = !string.IsNullOrWhiteSpace(ctx.TbApi.Text);
                var emailToCheck = isAdminInstall ? lockedEmail : ctx.TbEmail.Text;
                var hasEmail = !string.IsNullOrWhiteSpace(emailToCheck);
                var hasPass = !string.IsNullOrWhiteSpace(ctx.TbPass.Password);

                var formOk = hasUrl && hasEmail && hasPass;

                var isAdminNow = false;
                try
                {
                    isAdminNow = getIsAdmin?.Invoke() == true;
                }
                catch { }

                ctx.BtnPush.IsEnabled = isHealthy && formOk;
                ctx.BtnForceSync.IsEnabled = isHealthy && formOk && isAdminNow;
            }

            void RenderStatus(bool healthy)
            {
                isHealthy = healthy;

                var text = getHealthText?.Invoke() ?? AppConstants.HealthStatusUnreachable;
                ctx.StatusText.Text = text;

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
                            ctx.StatusDot,
                            Shape.FillProperty,
                            "SuccessBrush"
                        )
                    )
                    {
                        ctx.StatusDot.Fill = new SolidColorBrush(Color.FromRgb(0, 180, 0));
                    }
                }
                else if (isVersionMismatch)
                {
                    if (
                        !ThemeHelpers.TrySetDynamicBrush(
                            ctx.StatusDot,
                            Shape.FillProperty,
                            "WarningBrush"
                        )
                    )
                    {
                        ctx.StatusDot.Fill = new SolidColorBrush(Color.FromRgb(220, 160, 0));
                    }

                    if (!versionWarningShown)
                    {
                        versionWarningShown = true;
                        api.Dialogs.ShowMessage(
                            "SyncniteBridge server / extension version mismatch detected.\n\n"
                                + "Please install the matching Syncnite Bridge extension version "
                                + "for this server, then restart Playnite.\n\n"
                                + "Until then, sync is disabled.",
                            AppConstants.AppName
                        );
                    }
                }
                else
                {
                    if (
                        !ThemeHelpers.TrySetDynamicBrush(
                            ctx.StatusDot,
                            Shape.FillProperty,
                            "ErrorBrush"
                        )
                    )
                    {
                        ctx.StatusDot.Fill = new SolidColorBrush(Color.FromRgb(200, 0, 0));
                    }
                }

                RefreshActionButtons();
            }

            // Wiring
            ctx.TbApi.TextChanged += (s, e) => RefreshActionButtons();
            ctx.TbEmail.TextChanged += (s, e) => RefreshActionButtons();
            ctx.TbPass.PasswordChanged += (s, e) => RefreshActionButtons();
            ctx.BtnSave.Click += (s, e) =>
            {
                SaveAll();
                RefreshActionButtons();
            };
            ctx.BtnSaveClose.Click += (s, e) =>
            {
                SaveAll();
                win.Close();
            };
            ctx.BtnClose.Click += (s, e) => win.Close();
            ctx.BtnPush.Click += (s, e) => onPushInstalled?.Invoke();
            ctx.BtnForceSync.Click += (s, e) => onForceSyncLibrary?.Invoke();
            ctx.BtnReleaseAdmin.Click += (s, e) =>
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
                {
                    return;
                }

                onReleaseAdmin?.Invoke();
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

            var contentBorder = new Border { Padding = new Thickness(20), Child = root };
            if (
                !ThemeHelpers.TrySetDynamicBrush(
                    contentBorder,
                    Control.BackgroundProperty,
                    "PanelBackgroundBrush"
                )
                && !ThemeHelpers.TrySetDynamicBrush(
                    contentBorder,
                    Control.BackgroundProperty,
                    "ControlBackgroundBrush"
                )
            )
            {
                contentBorder.Background = Brushes.Transparent;
            }
            win.Content = contentBorder;
            win.SizeToContent = SizeToContent.WidthAndHeight;
            win.ShowDialog();
        }
    }
}
