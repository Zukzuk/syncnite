using System;
using System.Windows;
using System.Windows.Controls;
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
            win.Title = "ViewerBridge";

            var root = new Grid { Margin = new Thickness(12) };
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            var healthPanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Margin = new Thickness(0, 0, 0, 8),
            };

            var healthText = new TextBlock
            {
                Text = "Health:",
                VerticalAlignment = VerticalAlignment.Center,
            };
            healthPanel.Children.Add(healthText);

            var healthStatus = new TextBlock
            {
                Text = getHealthText(),
                Margin = new Thickness(6, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center,
            };
            healthPanel.Children.Add(healthStatus);

            ThemeHelpers.SetThemeTextBrush(healthText);
            ThemeHelpers.SetThemeTextBrush(healthStatus);

            Grid.SetRow(healthPanel, 0);
            root.Children.Add(healthPanel);

            var apiPanel = new StackPanel
            {
                Orientation = Orientation.Vertical,
                Margin = new Thickness(0, 0, 0, 8),
            };

            var apiHeader = new TextBlock
            {
                Text = "API Base [http(s)://host:port/api/]",
                Margin = new Thickness(0, 0, 0, 4),
            };
            apiPanel.Children.Add(apiHeader);

            var tbApi = new TextBox { Text = initialApiBase, MinWidth = 420 };

            ThemeHelpers.SetThemeTextBrush(apiHeader);
            ThemeHelpers.SetThemeTextBrush(tbApi);
            apiPanel.Children.Add(tbApi);

            Grid.SetRow(apiPanel, 1);
            root.Children.Add(apiPanel);

            var actions = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Margin = new Thickness(0, 4, 0, 8),
            };
            var btnPush = new Button
            {
                Content = "Sync Installed",
                Width = 120,
                Margin = new Thickness(0, 0, 8, 0),
            };
            var btnSync = new Button { Content = "Sync Library", Width = 120 };
            btnPush.Click += (s, e) => onPushInstalled();
            btnSync.Click += (s, e) => onSyncLibrary();
            actions.Children.Add(btnPush);
            actions.Children.Add(btnSync);
            Grid.SetRow(actions, 2);
            root.Children.Add(actions);

            var footer = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
            };
            var btnSave = new Button
            {
                Content = "Save",
                Width = 80,
                Margin = new Thickness(0, 0, 8, 0),
            };
            var btnClose = new Button { Content = "Close", Width = 100 };
            btnSave.Click += (s, e) =>
            {
                onSaveApiBase(tbApi.Text?.Trim());
                win.Close();
            };
            btnClose.Click += (s, e) =>
            {
                win.Close();
            };
            footer.Children.Add(btnSave);
            footer.Children.Add(btnClose);
            Grid.SetRow(footer, 3);
            root.Children.Add(footer);

            win.Content = root;
            win.SizeToContent = SizeToContent.WidthAndHeight;
            win.ShowDialog();
        }
    }
}
