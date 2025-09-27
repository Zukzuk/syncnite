using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace PlayniteViewerBridge.Helpers
{
    internal static class ThemeHelpers
    {
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
                    if (w.Background != null)
                        return;
                }
                catch { }
            }
        }

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
                    if (w.Foreground != null)
                        return;
                }
                catch { }
            }
        }

        public static void SetThemeTextBrush(FrameworkElement el)
        {
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
                        el.SetResourceReference(TextBlock.ForegroundProperty, k);
                        return;
                    }
                }
                catch { }
            }
        }

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
