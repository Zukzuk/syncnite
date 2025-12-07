import {
    createTheme,
    CSSVariablesResolver,
} from '@mantine/core';

// https://www.w3schools.com/colors/colors_schemes.asp
// https://mantine.dev/theming/colors/
// https://mantine.dev/styles/css-variables-list/
const COLOR = "cyan";
const SUCCESS_COLOR = "green";
const ERROR_COLOR = "red";
const WARNING_COLOR = "yellow";
const SUPPRESSED_COLOR = "gray";

export const interlinkedTheme = createTheme({
    cursorType: 'pointer',
    primaryColor: COLOR,
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
        '--interlinked-color-primary': `var(--mantine-color-${COLOR}-5)`,
        '--interlinked-color-primary-soft': `var(--mantine-color-${COLOR}-3)`,
        '--interlinked-color-primary-translucent': `var(--mantine-color-${COLOR}-0)`,
        '--interlinked-color-success': `var(--mantine-color-${SUCCESS_COLOR}-5)`,
        '--interlinked-color-success-soft': `var(--mantine-color-${SUCCESS_COLOR}-1)`,
        '--interlinked-color-error': `var(--mantine-color-${ERROR_COLOR}-5)`,
        '--interlinked-color-warning': `var(--mantine-color-${WARNING_COLOR}-5)`,
        '--interlinked-color-suppressed': `var(--mantine-color-${SUPPRESSED_COLOR}-6)`,
    },
    dark: {
        '--interlinked-color-primary': `var(--mantine-color-${COLOR}-6)`,
        '--interlinked-color-primary-soft': `var(--mantine-color-${COLOR}-4)`,
        '--interlinked-color-primary-translucent': `var(--mantine-color-${COLOR}-light)`,
        '--interlinked-color-success': `var(--mantine-color-${SUCCESS_COLOR}-8)`,
        '--interlinked-color-success-soft': `var(--mantine-color-${SUCCESS_COLOR}-4)`,
        '--interlinked-color-error': `var(--mantine-color-${ERROR_COLOR}-7)`,
        '--interlinked-color-warning': `var(--mantine-color-${WARNING_COLOR}-9)`,
        '--interlinked-color-suppressed': `var(--mantine-color-${SUPPRESSED_COLOR}-8)`,
    },
});

export const boringTheme = createTheme({
    cursorType: 'pointer',
    primaryColor: "cyan",
    fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    headings: {
        fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
    },
});
