using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.UI
{
    internal static class SettingsHeaderBuilder
    {
        public static void BuildHeaderRow(SettingsWindow ctx, string clientId)
        {
            var header = new Grid { Margin = new Thickness(0, 0, 0, 8) };
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            header.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var statusPanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 6, 0),
            };
            var statusDot = new Ellipse
            {
                Width = 10,
                Height = 10,
                Margin = new Thickness(0, 1, 6, 0),
                Fill = new SolidColorBrush(Color.FromRgb(140, 140, 140)),
            };

            var statusText = new TextBlock
            {
                Text = AppConstants.HealthStatusUnreachable,
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(statusText);

            statusPanel.Children.Add(statusDot);
            statusPanel.Children.Add(statusText);
            Grid.SetColumn(statusPanel, 0);
            header.Children.Add(statusPanel);

            var roleText = new TextBlock
            {
                Text = "(role unknown)",
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 6, 0),
            };
            ThemeHelpers.SetThemeTextBrush(roleText);
            Grid.SetColumn(roleText, 1);
            header.Children.Add(roleText);

            var versionText = new TextBlock
            {
                Text = "v" + BridgeVersion.Current,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 18, 0),
            };
            ThemeHelpers.SetThemeTextBrush(versionText);
            Grid.SetColumn(versionText, 2);
            header.Children.Add(versionText);

            var clientDisplay = string.IsNullOrWhiteSpace(clientId)
                ? "[no client id]"
                : $"[{clientId}]";
            var clientIdText = new TextBlock
            {
                Text = clientDisplay,
                VerticalAlignment = VerticalAlignment.Center,
                TextTrimming = TextTrimming.CharacterEllipsis,
            };
            ThemeHelpers.SetThemeTextBrush(clientIdText);
            Grid.SetColumn(clientIdText, 3);
            header.Children.Add(clientIdText);

            Grid.SetRow(header, 0);
            ctx.RootGrid.Children.Add(header);

            ctx.StatusDot = statusDot;
            ctx.StatusText = statusText;
            ctx.RoleText = roleText;
            ctx.VersionText = versionText;
            ctx.ClientIdText = clientIdText;
        }
    }
}
