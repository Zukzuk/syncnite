import { createTheme, CSSVariablesResolver, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

// https://www.w3schools.com/colors/colors_schemes.asp
// https://mantine.dev/theming/colors/
// https://mantine.dev/styles/css-variables-list/
const P_COLOR = "cyan";
const S_COLOR = "yellow";
const SUCCESS_COLOR = "green";
const ERROR_COLOR = "red";
const WARNING_COLOR = "orange";

export const interlinkedTheme = createTheme({
    cursorType: 'pointer',
    primaryColor: P_COLOR,
    fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    headings: {
        fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
    },
});

export const themeResolver: CSSVariablesResolver = (theme) => ({
    variables: {
        //'--mantine-hero-height': theme.other.heroHeight,
    },
    light: {
        '--interlinked-color-light': `var(--mantine-color-grey-1)`,
        '--interlinked-color-dark': `var(--mantine-color-dark-8)`,
        '--interlinked-color-suppressed': `var(--mantine-color-gray-6)`,
        '--interlinked-color-body': `var(--mantine-color-body)`,
        '--interlinked-color-primary': `var(--mantine-color-${P_COLOR}-5)`,
        '--interlinked-color-primary-soft': `var(--mantine-color-${P_COLOR}-3)`,
        '--interlinked-color-primary-translucent': `var(--mantine-color-${P_COLOR}-light-hover)`,
        '--interlinked-color-secondary': `var(--mantine-color-${S_COLOR}-5)`,
        '--interlinked-color-secondary-soft': `var(--mantine-color-${S_COLOR}-light-hover)`,
        '--interlinked-color-success': `var(--mantine-color-${SUCCESS_COLOR}-5)`,
        '--interlinked-color-success-soft': `var(--mantine-color-${SUCCESS_COLOR}-1)`,
        '--interlinked-color-error': `var(--mantine-color-${ERROR_COLOR}-5)`,
        '--interlinked-color-warning': `var(--mantine-color-${WARNING_COLOR}-5)`,
    },
    dark: {
        '--interlinked-color-light': `var(--mantine-color-grey-1)`,
        '--interlinked-color-dark': `var(--mantine-color-dark-8)`,
        '--interlinked-color-suppressed': `var(--mantine-color-dark-8)`,
        '--interlinked-color-body': `var(--mantine-color-body)`,
        '--interlinked-color-primary': `var(--mantine-color-${P_COLOR}-6)`,
        '--interlinked-color-primary-soft': `var(--mantine-color-${P_COLOR}-4)`,
        '--interlinked-color-primary-translucent': `var(--mantine-color-${P_COLOR}-light-hover)`,
        '--interlinked-color-secondary': `var(--mantine-color-${S_COLOR}-3)`,
        '--interlinked-color-secondary-soft': `var(--mantine-color-${S_COLOR}-light-hover)`,
        '--interlinked-color-success': `var(--mantine-color-${SUCCESS_COLOR}-8)`,
        '--interlinked-color-success-soft': `var(--mantine-color-${SUCCESS_COLOR}-4)`,
        '--interlinked-color-error': `var(--mantine-color-${ERROR_COLOR}-7)`,
        '--interlinked-color-warning': `var(--mantine-color-${WARNING_COLOR}-9)`,
    },
});

// Returns the current theme and whether dark mode is active
/**
xs	36em	576px
sm	48em	768px
md	62em	992px
lg	75em	1200px
xl	88em	1408px
 */
export function getTheme() {
    const breakpoint = 'xs';
    const theme = useMantineTheme();
    const { colorScheme, setColorScheme } = useMantineColorScheme();
    const isDark = colorScheme === "dark";
    const isDesktop = useMediaQuery(`(min-width: ${theme.breakpoints[breakpoint]})`);

    return { theme, isDark, setColorScheme, isDesktop, breakpoint };
}
