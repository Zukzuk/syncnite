import { useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { useCallback, useMemo } from "react";
import { DesktopNavMode } from "../types/app";
import { InterLinkedTheme } from "../types/interlinked";

/**
  xs	36em	576px
  sm	48em	768px
  md	62em	992px
  lg	75em	1200px
  xl	88em	1408px
*/

// Custom hook to provide theme and layout-related information for InterLinked.
export function useInterLinkedTheme(): InterLinkedTheme {
    const theme = useMantineTheme();
    const { colorScheme, setColorScheme } = useMantineColorScheme();
    const isDark = colorScheme === "dark";

    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.xs})`, false, {
        getInitialValueInEffect: false,
    });

    const isTablet = useMediaQuery(
        `(min-width: ${theme.breakpoints.xs}) and (max-width: ${theme.breakpoints.sm})`, false,
        { getInitialValueInEffect: false }
    );

    const hasNavbar = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`, false, {
        getInitialValueInEffect: false,
    });

    const isDesktop = useMediaQuery(
        `(min-width: ${theme.breakpoints.sm}) and (max-width: ${theme.breakpoints.xl})`, false,
        { getInitialValueInEffect: false }
    );

    const isWidescreen = useMediaQuery(`(min-width: ${theme.breakpoints.xl})`, false, {
        getInitialValueInEffect: false,
    });

    const [desktopMode, setDesktopMode] = useLocalStorage<DesktopNavMode>({
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

    const RATIO = 23 / 32;
    const cardMinWidth = 125;
    const cardMaxWidth = 220;
    const coverWidth = 220;

    const Z_INDEX = useMemo(
        () =>
            ({
                belowBase: 0,
                base: 1,
                aboveBase: 2,
                float: 10,
                medium: 50,
                high: 100,
                heigher: 500,
                top: 1000,
            }) as const,
        []
    );

    const grid = useMemo(
        () =>
            ({
                navBarWidth: 155,
                navBarMiniWidth: 72,
                coverWidth,
                coverHeight: coverWidth * (1 / RATIO),
                cardWidth: cardMinWidth + 4, // + border
                cardHeight: cardMinWidth * (1 / RATIO) + 4 + 52 + 28, // + border + title + icons
                cardMinWidth,
                cardMaxWidth,
                rowHeight: 60,
                halfRowHeight: 30,
                iconSize: 38,
                scrollbarWidth: 15,
                listLeftPadding: 12,
                gap: 8,
                cardStepY: 90,
                ratio: RATIO,
                overscan: { top: 600, bottom: 800 } as const,
                z: Z_INDEX,
            }) as const,
        [isWidescreen, isDesktop, Z_INDEX]
    );

    return {
        theme,
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
