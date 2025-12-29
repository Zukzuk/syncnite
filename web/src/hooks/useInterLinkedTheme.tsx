import { useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { useCallback } from "react";
import { InterLinkedTheme } from "../types/interlinked";
import { DesktopMode } from "../types/app";
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

export const themeResolver: CSSVariablesResolver = (mantine) => ({
    variables: {
        //'--mantine-hero-height': mantine.other.heroHeight,
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
        '--interlinked-color-suppressed': `var(--mantine-color-gray-6)`,
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
        '--interlinked-color-warning': `var(--mantine-color-${WARNING_COLOR}-7)`,
    },
});

/**
  xs	36em	576px
  sm	48em	768px
  md	62em	992px
  lg	75em	1200px
  xl	88em	1408px
*/

// Custom hook to provide theme and layout-related information for InterLinked.
export function useInterLinkedTheme(): InterLinkedTheme {
    const mantine = useMantineTheme();
    const { colorScheme, setColorScheme } = useMantineColorScheme();
    const isDark = colorScheme === "dark";
    const breakpointLabel = "md";

    const isMobile = useMediaQuery(`(max-width: ${mantine.breakpoints.xs})`, false, {
        getInitialValueInEffect: false,
    });

    const isTablet = useMediaQuery(
        `(min-width: ${mantine.breakpoints.xs}) and (max-width: ${mantine.breakpoints.md})`, false,
        { getInitialValueInEffect: false }
    );

    const hasNavbar = useMediaQuery(`(min-width: ${mantine.breakpoints.md})`, false, {
        getInitialValueInEffect: false,
    });

    const isDesktop = useMediaQuery(
        `(min-width: ${mantine.breakpoints.md}) and (max-width: ${mantine.breakpoints.xl})`, false,
        { getInitialValueInEffect: false }
    );

    const isWidescreen = useMediaQuery(`(min-width: ${mantine.breakpoints.xl})`, false, {
        getInitialValueInEffect: false,
    });

    const [desktopMode, setDesktopMode] = useLocalStorage<DesktopMode>({
        key: "interlinked-desktopMode",
        defaultValue: "normal",
    });

    const [navbarOpened, setNavbarOpened] = useLocalStorage<boolean>({
        key: "interlinked-navbarOpened",
        defaultValue: false,
    });

    const toggleNavbar = useCallback(() => {
        setNavbarOpened((v) => !v);
    }, [setNavbarOpened]);

    const closeNavbar = useCallback(() => {
        setNavbarOpened(false);
    }, [setNavbarOpened]);

    const ratio = 23 / 32;
    const cardMinWidth = 125;
    const cardDefaultWidth = 156;
    const cardMaxWidth = 220;
    const coverWidth = 220;
    const detailsPanelWidth = 236;
    const gap = 8;

    const z = {
        belowBase: 0,
        base: 1,
        aboveBase: 2,
        float: 10,
        medium: 50,
        high: 100,
        heigher: 500,
        top: 1000,
    };

    const grid = {
        navBarWidth: 155,
        navBarMiniWidth: 72,
        coverWidth,
        coverHeight: coverWidth * (1 / ratio),
        detailsPanelWidth,
        cardDefaultWidth,
        cardMinWidth,
        cardMaxWidth,
        gridCardBottom: 52 + 28, // title + extra info
        rowHeight: 60,
        halfRowHeight: 30,
        iconSize: 38,
        scrollbarWidth: 15,
        listLeftPadding: 12,
        gap,
        gapLg: gap * 7,
        gapMd: gap * 3,
        ratio,
        overscan: { top: 600, bottom: 800 } as const,
        z,
    };

    return {
        mantine,
        breakpointLabel,
        isDark,
        isMobile,
        isTablet,
        isDesktop,
        isWidescreen,
        hasNavbar,
        grid,
        desktopMode,
        navbarOpened,
        toggleNavbar,
        closeNavbar,
        setDesktopMode,
        setColorScheme,
    };
}
