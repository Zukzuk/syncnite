using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;
using Playnite.SDK;

namespace SyncniteBridge.UI
{
    internal sealed class SettingsWindow
    {
        public Window Window { get; }
        public Grid RootGrid { get; }
        public TextBox TbApi { get; set; }
        public TextBox TbEmail { get; set; }
        public PasswordBox TbPass { get; set; }
        public Button BtnPush { get; set; }
        public Button BtnForceSync { get; set; }
        public Button BtnSave { get; set; }
        public Button BtnReleaseAdmin { get; set; }
        public Button BtnSaveClose { get; set; }
        public Button BtnClose { get; set; }
        public TextBlock RoleText { get; set; }
        public TextBlock StatusText { get; set; }
        public TextBlock VersionText { get; set; }
        public TextBlock ClientIdText { get; set; }
        public StackPanel ForcePanel { get; set; }
        public Ellipse StatusDot { get; set; }
        public Grid BusyOverlay { get; set; }
        public TextBlock BusyText { get; set; }
        public Action<bool, string?> SetBusy { get; private set; }

        public SettingsWindow(IPlayniteAPI api)
        {
            Window = api.Dialogs.CreateWindow(
                new WindowCreationOptions
                {
                    ShowCloseButton = true,
                    ShowMaximizeButton = false,
                    ShowMinimizeButton = false,
                }
            );

            Window.MinWidth = 600;

            RootGrid = new Grid { Margin = new Thickness(16) };
            for (var i = 0; i < 11; i++)
            {
                RootGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            }

            TbApi = null!;
            TbEmail = null!;
            TbPass = null!;
            BtnPush = null!;
            BtnForceSync = null!;
            BtnSave = null!;
            BtnReleaseAdmin = null!;
            BtnSaveClose = null!;
            BtnClose = null!;
            RoleText = null!;
            StatusDot = null!;
            StatusText = null!;
            VersionText = null!;
            ClientIdText = null!;
            ForcePanel = null!;

            BusyOverlay = null!;
            BusyText = null!;

            // default no-op; factory will replace
            SetBusy = (_, __) => { };
        }

        internal void BindBusyUi(Grid overlay, TextBlock text)
        {
            BusyOverlay = overlay;
            BusyText = text;

            SetBusy = (busy, msg) =>
            {
                try
                {
                    // Always marshal to UI thread
                    Window.Dispatcher.Invoke(() =>
                    {
                        BusyOverlay.Visibility = busy ? Visibility.Visible : Visibility.Collapsed;
                        BusyText.Text = string.IsNullOrWhiteSpace(msg) ? "Working…" : msg!;

                        // Optional: disable action buttons while busy (leave Close enabled)
                        try
                        {
                            BtnPush.IsEnabled = !busy && BtnPush.IsEnabled;
                        }
                        catch { }
                        try
                        {
                            BtnForceSync.IsEnabled = !busy && BtnForceSync.IsEnabled;
                        }
                        catch { }
                        try
                        {
                            BtnSave.IsEnabled = !busy;
                        }
                        catch { }
                        try
                        {
                            BtnSaveClose.IsEnabled = !busy;
                        }
                        catch { }
                        try
                        {
                            BtnReleaseAdmin.IsEnabled = !busy;
                        }
                        catch { }
                    });
                }
                catch
                {
                    // ignore (window may be closing)
                }
            };
        }
    }
}
