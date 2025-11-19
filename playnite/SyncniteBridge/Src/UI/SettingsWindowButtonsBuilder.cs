using System.Windows;
using System.Windows.Controls;

namespace SyncniteBridge.UI
{
    internal static class SettingsWindowButtonsBuilder
    {
        public static void BuildWindowButtons(SettingsWindow ctx)
        {
            // Bottom row 11
            var bottomRow = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
                Margin = new Thickness(0, 8, 0, 0),
            };

            var btnSaveClose = new Button
            {
                Content = "Save and close",
                Width = 120,
                Margin = new Thickness(0, 0, 8, 0),
            };
            bottomRow.Children.Add(btnSaveClose);

            var btnClose = new Button { Content = "Close", Width = 80 };
            bottomRow.Children.Add(btnClose);

            Grid.SetRow(bottomRow, 11);
            ctx.RootGrid.Children.Add(bottomRow);

            ctx.BtnSaveClose = btnSaveClose;
            ctx.BtnClose = btnClose;
        }
    }
}
