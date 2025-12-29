import { useMantineTheme } from "@mantine/core";
import { PlayniteGameLink } from "./playnite";
import { ItemPositions, VisibleRange } from "./app";

export type InterLinkedMedia = "game" | "movie" | "series" | "audiobook" |
    "book" | "music-album" | "animated-series" | "animated-movie";

interface InterLinkedItem {
    type: InterLinkedMedia;
    origin: InterLinkedOrigin;
    id: string;
    title: string;
    isHidden: boolean;
    tags: string[];
    series: string[];

    sortingName?: string;
    year?: number;
    iconUrl?: string;
    coverUrl?: string;
    bgUrl?: string;
};

export interface InterLinkedGameItem extends InterLinkedItem {
    gameId: string;
    isInstalled: boolean;
    tags: string[];
    series: string[];
    playniteLink: string;
    titleWithoutVersion: string;
    source: string;
    developers: string[];
    publishers: string[];

    index?: number;
    version?: string;
    sourceLink?: string;
    playniteOpenLink?: string;
    htmlLink?: string;
    links?: PlayniteGameLink[];
}

export interface OriginLoadedData {
    items: InterLinkedGameItem[];
    allSources: string[];
    allTags: string[];
    allSeries: string[];
}

export type InterLinkedOrigin =
    "playnite" | "steam" | "epic" | "gog" |
    "ea app" | "ubisoft connect" | "battle.net" |
    "humble" | "microsoft store" | "xbox" |
    "nintendo" | "abandonware" | "emulator" |
    "plex" | "komga";

export type InterLinkedData = {
    [K in InterLinkedOrigin]?: OriginLoadedData;
};

type TZIndex = {
    belowBase: number;
    base: number;
    aboveBase: number;
    float: number;
    medium: number;
    high: number;
    top: number;
};

type TOverscan = { top: number; bottom: number }

export type InterLinkedGrid = {
    navBarWidth: number;
    navBarMiniWidth: number;
    coverWidth: number;
    coverHeight: number;
    detailsPanelWidth: number;
    cardMinWidth: number;
    cardDefaultWidth: number;
    cardMaxWidth: number;
    gridCardBottom: number;
    rowHeight: number;
    halfRowHeight: number;
    iconSize: number;
    scrollbarWidth: number;
    listLeftPadding: number;
    ratio: number;
    overscan: TOverscan;
    gap: number;
    gapRight: number;
    gapAssociated: number;
    z: TZIndex;
};

export type InterLinkedDynamicGrid = {
    gridViewportW: number;
    gridViewportH: number;
    deckAndStacksWidth: number;
    deckAndStacksHeight: number;
    gridCardWidth: number;
    gridCardHeight: number;
    deckCardWidth: number;
    deckCardHeight: number;
    stackCardWidth: number;
    stackCardHeight: number;
    numOfCols: number;
    strideX: number;
    cardStepY: number;
    gridTotalHeight: number;
    positions: ItemPositions;
    visibleRange: VisibleRange;
}

export interface InterLinkedTheme {
    theme: ReturnType<typeof useMantineTheme>;
    isDark: boolean;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isWidescreen: boolean;
    hasNavbar: boolean;
    grid: InterLinkedGrid;
    desktopMode: DesktopMode;
    navbarOpened: boolean;
    setDesktopMode: Dispatch<SetStateAction<DesktopMode>>;
    toggleNavbar: () => void;
    closeNavbar: () => void;
    setColorScheme: (value: ColorScheme) => void;
}
