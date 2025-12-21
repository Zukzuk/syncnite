import { createTheme, CSSVariablesResolver } from '@mantine/core';

// https://www.w3schools.com/colors/colors_schemes.asp
// https://mantine.dev/theming/colors/
// https://mantine.dev/styles/css-variables-list/
const PRIMARY_COLOR = "cyan";
const SECONDARY_COLOR = "yellow";
const SUCCESS_COLOR = "green";
const ERROR_COLOR = "red";
const WARNING_COLOR = "orange";

export const interlinkedTheme = createTheme({
    cursorType: 'pointer',
    primaryColor: PRIMARY_COLOR,
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

        '--interlinked-color-primary': `var(--mantine-color-${PRIMARY_COLOR}-5)`,
        '--interlinked-color-primary-soft': `var(--mantine-color-${PRIMARY_COLOR}-3)`,
        '--interlinked-color-primary-softer': `var(--mantine-color-${PRIMARY_COLOR}-light-hover)`,

        '--interlinked-color-secondary': `var(--mantine-color-${SECONDARY_COLOR}-5)`,
        '--interlinked-color-secondary-soft': `var(--mantine-color-${SECONDARY_COLOR}-light-hover)`,
        '--interlinked-color-secondary-softer': `var(--mantine-color-${SECONDARY_COLOR}-light)`,

        '--interlinked-color-success': `var(--mantine-color-${SUCCESS_COLOR}-5)`,
        '--interlinked-color-success-soft': `var(--mantine-color-${SUCCESS_COLOR}-1)`,

        '--interlinked-color-error': `var(--mantine-color-${ERROR_COLOR}-5)`,
        '--interlinked-color-warning': `var(--mantine-color-${WARNING_COLOR}-5)`,
    },
    dark: {
        '--interlinked-color-light': `var(--mantine-color-grey-1)`,
        '--interlinked-color-dark': `var(--mantine-color-dark-9)`,
        '--interlinked-color-suppressed': `var(--mantine-color-dark-8)`,
        '--interlinked-color-body': `var(--mantine-color-body)`,

        '--interlinked-color-primary': `var(--mantine-color-${PRIMARY_COLOR}-6)`,
        '--interlinked-color-primary-soft': `var(--mantine-color-${PRIMARY_COLOR}-4)`,
        '--interlinked-color-primary-softer': `var(--mantine-color-${PRIMARY_COLOR}-light-hover)`,

        '--interlinked-color-secondary': `var(--mantine-color-${SECONDARY_COLOR}-3)`,
        '--interlinked-color-secondary-soft': `var(--mantine-color-${SECONDARY_COLOR}-light-hover)`,
        '--interlinked-color-secondary-softer': `var(--mantine-color-${SECONDARY_COLOR}-light)`,

        '--interlinked-color-success': `var(--mantine-color-${SUCCESS_COLOR}-8)`,
        '--interlinked-color-success-soft': `var(--mantine-color-${SUCCESS_COLOR}-4)`,

        '--interlinked-color-error': `var(--mantine-color-${ERROR_COLOR}-7)`,
        '--interlinked-color-warning': `var(--mantine-color-${WARNING_COLOR}-9)`,
    },
});