using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Helper methods for applying Playnite themes to WPF elements.
    /// </summary>
    internal static class ThemeHelpers
    {
        /// <summary>
        /// Try to apply the given style to the element.
        /// </summary>
        public static void TryStyle(FrameworkElement el, string styleKey)
        {
            try
            {
                var s = el.FindResource(styleKey) as Style;
                if (s != null)
                    el.Style = s;
            }
            catch { }
        }

        /// <summary>
        /// Hook theme background to the given Window.
        /// </summary>
        public static void HookThemeBackground(Window w)
        {
            var keys = new[]
            {
                "WindowBackgroundBrush",
                "MainWindowBackgroundBrush",
                "ControlBackgroundBrush",
                "PanelBackgroundBrush",
            };
            foreach (var k in keys)
            {
                try
                {
                    w.SetResourceReference(Control.BackgroundProperty, k);
                    return; // resource reference set; let WPF resolve it
                }
                catch { }
            }
        }

        /// <summary>
        /// Hook theme foreground to the given Window.
        /// </summary>
        public static void HookThemeForeground(Window w)
        {
            var keys = new[]
            {
                "WindowForegroundBrush",
                "MainWindowForegroundBrush",
                "ControlForegroundBrush",
                "TextBrush",
            };
            foreach (var k in keys)
            {
                try
                {
                    w.SetResourceReference(Control.ForegroundProperty, k);
                    return; // resource reference set
                }
                catch { }
            }
        }

        /// <summary>
        /// Set the text brush on the given element.
        /// </summary>
        public static void SetThemeTextBrush(FrameworkElement el)
        {
            if (el == null)
                return;

            // Prefer Control.Foreground if the element is a Control, otherwise TextBlock.Foreground
            var prop = (el is Control) ? Control.ForegroundProperty : TextBlock.ForegroundProperty;

            var keys = new[]
            {
                "TextBrush",
                "WindowForegroundBrush",
                "ControlForegroundBrush",
                "MainWindowForegroundBrush",
            };

            foreach (var k in keys)
            {
                try
                {
                    var brush = el.TryFindResource(k) as Brush;
                    if (brush != null)
                    {
                        el.SetResourceReference(prop, k);
                        return;
                    }
                }
                catch { }
            }
        }

        /// <summary>
        /// Try to set a dynamic brush on the given element.
        /// </summary>
        public static bool TrySetDynamicBrush(
            FrameworkElement el,
            DependencyProperty prop,
            string key
        )
        {
            try
            {
                var brush = el.TryFindResource(key) as Brush;
                if (brush == null)
                    return false;
                el.SetResourceReference(prop, key);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
