using System.Windows;
using System.Windows.Controls;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.UI
{
    internal static class SettingsManualActionsBuilder
    {
        public static void BuildManualActions(SettingsWindow ctx)
        {
            // Push installed row (row 7)
            var pushRow = new Grid { Margin = new Thickness(0, 6, 0, 6) };
            pushRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            pushRow.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );

            var pushPanel = new StackPanel { Orientation = Orientation.Horizontal };

            var btnPush = new Button
            {
                Content = "Push installed",
                Width = 110,
                Margin = new Thickness(0, 0, 12, 0),
            };
            pushPanel.Children.Add(btnPush);

            var pushText = new TextBlock
            {
                Text = "Push list of locally installed games",
                TextWrapping = TextWrapping.Wrap,
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(pushText);
            pushPanel.Children.Add(pushText);

            Grid.SetColumn(pushPanel, 0);
            Grid.SetColumnSpan(pushPanel, 2);
            pushRow.Children.Add(pushPanel);

            Grid.SetRow(pushRow, 7);
            ctx.RootGrid.Children.Add(pushRow);

            // Force sync row (row 8)
            var forceRow = new Grid { Margin = new Thickness(0, 4, 0, 8) };
            forceRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            forceRow.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );

            var forcePanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Visibility = Visibility.Collapsed,
            };

            var btnForceSync = new Button
            {
                Content = "Force sync",
                Width = 110,
                Margin = new Thickness(0, 0, 12, 0),
            };
            forcePanel.Children.Add(btnForceSync);

            var forceText = new TextBlock
            {
                Text = "Force sync of the full library (admin only)",
                TextWrapping = TextWrapping.Wrap,
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(forceText);
            forcePanel.Children.Add(forceText);

            Grid.SetColumn(forcePanel, 0);
            Grid.SetColumnSpan(forcePanel, 2);
            forceRow.Children.Add(forcePanel);

            Grid.SetRow(forceRow, 8);
            ctx.RootGrid.Children.Add(forceRow);

            ctx.BtnPush = btnPush;
            ctx.BtnForceSync = btnForceSync;
            ctx.ForcePanel = forcePanel;
        }
    }
}
