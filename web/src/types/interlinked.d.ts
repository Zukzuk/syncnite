import { MantineTheme, useMantineTheme } from "@mantine/core";
import { PlayniteGameLink } from "./playnite";

export type InterLinkedType =
    "game" | "movie" | "show" | "audiobook" | "book" |
    "music-album" | "episode" | "track" | "chapter" | "file";

export type InterLinkedOrigin =
    "playnite" | "steam" | "epic" | "gog" |
    "ea app" | "ubisoft connect" | "battle.net" |
    "humble" | "microsoft store" | "xbox" |
    "nintendo" | "abandonware" | "emulator" |
    "plex" | "komga";

interface InterLinkedBaseItem {
    type: InterLinkedType;
    origin: InterLinkedOrigin;
    id: string;
    title: string;
    titleWithoutVersion: string;
    isHidden: boolean;
    tags: string[];
    series: string[];
    originLink: string;

    version?: string;
    description?: string;
    searchableDescription?: string;
    originRunLink?: string;
    sortingName?: string;
    year?: number;
    iconUrl?: string;
    coverUrl?: string;
    bgUrl?: string;
};

export interface InterLinkedGameItem extends InterLinkedBaseItem {
    gameId: string;
    isInstalled: boolean;
    source: string;
    developers: string[];
    publishers: string[];

    index?: number;
    htmlLink?: string;
    sourceLink?: string;
    links?: PlayniteGameLink[];
}

export interface InterLinkedItemPart extends InterLinkedBaseItem {
    partType: InterLinkedType;

    season?: number;
    index?: number;
    htmlLink?: string;
    durationMs?: number;
    filePath?: string;
};

export interface InterLinkedMovieItem extends InterLinkedBaseItem {
    totalDurationMs?: number;
    htmlLink?: string;
};

export interface InterLinkedShowItem extends InterLinkedBaseItem {
    parts?: InterLinkedItemPart[];
    totalDurationMs?: number;
    htmlLink?: string;
};

export interface InterLinkedAudiobookItem extends InterLinkedBaseItem {
    parts?: InterLinkedItemPart[];
    totalDurationMs?: number;
    htmlLink?: string;
};

export type InterLinkedItem =
    | InterLinkedGameItem
    | InterLinkedMovieItem
    | InterLinkedShowItem
    | InterLinkedAudiobookItem
    | InterLinkedItemPart;

export interface OriginLoadedData {
    items: InterLinkedItem[];
    allSources: string[];
    allTags: string[];
    allSeries: string[];
}

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
    gridCardMinWidth: number;
    gridCardDefaultWidth: number;
    gridCardMaxWidth: number;
    gridCardBottom: number;
    rowHeight: number;
    halfRowHeight: number;
    iconSize: number;
    scrollbarWidth: number;
    listLeftPadding: number;
    ratio: number;
    gap: number;
    gapMd: number;
    gapLg: number;
    minSiteWidth: number;
    overscan: TOverscan;
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
    mantine: MantineTheme;
    breakpointLabel: MantineSize;
    grid: InterLinkedGrid;
    isDark: boolean;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isWidescreen: boolean;
    hasNavbar: boolean;
    desktopMode: DesktopMode;
    navbarOpened: boolean;
    setDesktopMode: Dispatch<SetStateAction<DesktopMode>>;
    toggleNavbar: () => void;
    closeNavbar: () => void;
    setColorScheme: (value: ColorScheme) => void;
}
