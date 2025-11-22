using System.Windows;
using System.Windows.Controls;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.UI
{
    internal static class SettingsFormBuilder
    {
        public static void BuildForm(
            SettingsWindow ctx,
            string initialBaseUrlAndPort,
            string? initialEmail,
            string initialPassword,
            bool isAdminInstall
        )
        {
            // API URL row (row 2)
            var apiRow = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            apiRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });
            apiRow.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );

            var apiLabel = new TextBlock
            {
                Text = "API URL",
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(apiLabel);
            Grid.SetColumn(apiLabel, 0);
            apiRow.Children.Add(apiLabel);

            var tbApi = new TextBox { Text = initialBaseUrlAndPort ?? string.Empty };
            ThemeHelpers.SetThemeTextBrush(tbApi);
            Grid.SetColumn(tbApi, 1);
            apiRow.Children.Add(tbApi);

            Grid.SetRow(apiRow, 2);
            ctx.RootGrid.Children.Add(apiRow);

            // Username row (row 3)
            var userRow = new Grid { Margin = new Thickness(0, 4, 0, 10) };
            userRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });
            userRow.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );

            var userLabel = new TextBlock
            {
                Text = "Username",
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(userLabel);
            Grid.SetColumn(userLabel, 0);
            userRow.Children.Add(userLabel);

            var tbEmail = new TextBox();
            ThemeHelpers.SetThemeTextBrush(tbEmail);
            Grid.SetColumn(tbEmail, 1);
            userRow.Children.Add(tbEmail);

            Grid.SetRow(userRow, 3);
            ctx.RootGrid.Children.Add(userRow);

            // Password row (row 4)
            var passRow = new Grid { Margin = new Thickness(0, 4, 0, 12) };
            passRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });
            passRow.ColumnDefinitions.Add(
                new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }
            );

            var passLabel = new TextBlock
            {
                Text = "Password",
                VerticalAlignment = VerticalAlignment.Center,
            };
            ThemeHelpers.SetThemeTextBrush(passLabel);
            Grid.SetColumn(passLabel, 0);
            passRow.Children.Add(passLabel);

            var tbPass = new PasswordBox();
            if (!string.IsNullOrEmpty(initialPassword))
            {
                tbPass.Password = initialPassword;
            }
            Grid.SetColumn(tbPass, 1);
            passRow.Children.Add(tbPass);

            Grid.SetRow(passRow, 4);
            ctx.RootGrid.Children.Add(passRow);

            ctx.TbApi = tbApi;
            ctx.TbEmail = tbEmail;
            ctx.TbPass = tbPass;

            // Row 5: Save + Release admin
            var saveRow = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Left,
                Margin = new Thickness(0, 8, 0, 10),
            };

            var btnSave = new Button
            {
                Content = "Save settings",
                Width = 110,
                Margin = new Thickness(0, 0, 12, 0),
            };
            saveRow.Children.Add(btnSave);

            var btnReleaseAdmin = new Button
            {
                Content = "Release admin",
                Width = 110,
                Visibility = Visibility.Collapsed,
            };
            saveRow.Children.Add(btnReleaseAdmin);

            Grid.SetRow(saveRow, 5);
            ctx.RootGrid.Children.Add(saveRow);

            ctx.BtnSave = btnSave;
            ctx.BtnReleaseAdmin = btnReleaseAdmin;
        }
    }
}
