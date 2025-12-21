import { useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { DesktopNavMode, InterLinkedTheme } from "../types/types";
import { useState } from "react";

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
    const isMobile = useMediaQuery(
        `(max-width: ${theme.breakpoints.xs})`,
        false,
        { getInitialValueInEffect: false }
    );
    const isTablet = useMediaQuery(
        `(min-width: ${theme.breakpoints.xs}) and (max-width: ${theme.breakpoints.sm})`,
        false,
        { getInitialValueInEffect: false }
    );
    const hasMenu = useMediaQuery(
        `(min-width: ${theme.breakpoints.sm})`,
        false,
        { getInitialValueInEffect: false }
    );
    const isDesktop = useMediaQuery(
        `(min-width: ${theme.breakpoints.sm}) and (max-width: ${theme.breakpoints.xl})`,
        false,
        { getInitialValueInEffect: false }
    );
    const isWidescreen = useMediaQuery(
        `(min-width: ${theme.breakpoints.xl})`,
        false,
        { getInitialValueInEffect: false }
    );

    const [desktopMode, setDesktopMode] = useState<DesktopNavMode>("normal");
    const [navbarOpened, { toggle: toggleNavbar, close: closeNavbar }] = useDisclosure(false);

    const RATIO = 23 / 32;

    const Z_INDEX = {
        belowBase: 0,
        base: 1,
        aboveBase: 2,
        float: 10,
        medium: 50,
        high: 100,
        heigher: 500,
        top: 1000,
    } as const;

    const grid = {
        colsList: `40px minmax(0, 1fr) 60px 80px ${isWidescreen ? "300px" : isDesktop ? "150px" : "0px"}`,
        colsGrid: "0px 60px 60px 80px 60px",
        colsOpen: "40px minmax(0, 1fr) 56px",
        navBarWidth: 155,
        navBarMiniWidth: 72,
        coverWidth: 220,
        coverHeight: 220 * (1 / RATIO),
        cardWidth: 156 + 4, // + border
        cardHeight: 156 * (1 / RATIO) + 4 + 52 + 28, // + border + title + icons
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
    } as const;

    return {
        theme,
        isDark,
        isMobile,
        isTablet,
        isDesktop,
        isWidescreen,
        hasMenu,
        grid,
        desktopMode,
        navbarOpened,
        toggleNavbar,
        closeNavbar,
        setDesktopMode,
        setColorScheme
    };
}
