import { Dispatch, SetStateAction } from "react";
import { LETTERS } from "../constants";
import { GameLink } from "./playnite";
import { useMantineTheme } from "@mantine/core";

declare global { interface Window { __APP_VERSION__?: string } }

export type SortKey = "title" | "series" | "year" | "source" | "tags";

export type SortDir = "asc" | "desc";

export type ViewMode = "list" | "grid";

export type ColorScheme = "light" | "dark";

export type SwitchesMode = "enabled" | "disabled";

export type Role = "admin" | "user" | "unknown";

export type NavMode = "replace" | "push";

export type DesktopNavMode = "closed" | "mini" | "normal";

export type ButtonTypes = "button" | "submit" | "link";

export interface AuthState {
  ready: boolean;
  loggedIn: boolean;
  email: string | null;
  role: string | null;
};

export interface Creds {
  email: string;
  password: string;
}

export interface AccountCreds {
  email: string;
  password: string;
  role: Role;
};

export interface CookieState {
  q: string;
  sources: string[];
  tags: string[];
  series: string[];
  showHidden: boolean;
  installedOnly: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
};

export interface UIControls {
  view: ViewMode,
  setView: (view: ViewMode) => void;
  isListView: boolean;
  switches: SwitchesMode,
  setSwitches: (mode: SwitchesMode) => void;
  q: string;
  setQ: Dispatch<SetStateAction<string>>;
  sources: string[];
  setSources: Dispatch<SetStateAction<string[]>>;
  tags: string[];
  setTags: Dispatch<SetStateAction<string[]>>;
  series: string[];
  setSeries: Dispatch<SetStateAction<string[]>>;
  showHidden: boolean;
  setShowHidden: Dispatch<SetStateAction<boolean>>;
  sortKey: SortKey;
  sortDir: SortDir;
  setSortKey: Dispatch<SetStateAction<SortKey>>;
  onToggleSort: (key: SortKey) => void;
  installedOnly: boolean;
  setShowInstalledOnly: Dispatch<SetStateAction<boolean>>;
}

export interface UIDerivedData {
  filteredCount: number;
  totalCount: number;
  itemsAssociated: GameItem[];
  itemsSorted: GameItem[];
  itemsGroupedByLetter: ItemGroupedByLetter[];
};

export interface GameItem {
  id: string;
  index?: number;
  gameId: string;
  title: string;
  sortingName: string | null;
  year: number | null;
  version: string | null;
  source: string;
  sourceLink: string | null;
  playniteLink: string;
  htmlLink: string | null;
  links: GameLink[] | null;
  isHidden: boolean;
  isInstalled: boolean;
  tags: string[];
  series: string[];
  iconUrl: string | null;
  coverUrl: string | null;
  bgUrl: string | null;
};

export interface LoadedData {
  items: GameItem[];
  allSources: string[];
  allTags: string[];
  allSeries: string[];
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

export type TGrid = {
    colsList: string;
    colsGrid: string;
    colsOpen: string;
    navBarWidth: number;
    navBarMiniWidth: number;
    coverWidth: number;
    coverHeight: number;
    cardWidth: number;
    cardHeight: number;
    rowHeight: number;
    halfRowHeight: number;
    iconSize: number;
    scrollbarWidth: number;
    listLeftPadding: number;
    cardStepY: number;
    ratio: number;
    overscan: TOverscan;
    gap: number;
    z: TZIndex;
};

export interface InterLinkedTheme {
    theme: ReturnType<typeof useMantineTheme>;
    isDark: boolean;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isWidescreen: boolean;
    hasMenu: boolean;
    grid: TGrid;
    desktopMode: DesktopNavMode;
    navbarOpened: boolean;
    toggleNavbar: () => void;
    closeNavbar: () => void;
    setDesktopMode: Dispatch<SetStateAction<DesktopNavMode>>;
    setColorScheme: (value: ColorScheme) => void;
}

export type Letter = typeof LETTERS[number];

export interface ItemGroupedByLetter {
  item: GameItem;
  itemLetter: Letter
};

export interface AlphabeticalGroup {
  items: GameItem[];
  groupLetter: string;
};

export interface GridRows {
  rowItems: number[][];
  rowIsOpen: boolean[];
};

export interface RowLayout {
  rowTops: number[];
  rowHeights: number[];
  containerHeight: number;
  itemRowIndex: number[];
  itemColIndex: number[];
};

export interface ItemPositions extends Array<{
  left: number;
  top: number
}> { };

export type ScoredHit<T = string> = {
    item: T;
    score: number;
};

export type AssociatedLayout = {
  deckColumns: number;
  stackColumns: number;
  maxCardsPerDeckColumn: number | null;
  minStackColumns: number;
};

export interface AssociatedItems {
  key: string;
  label: string;
  items: GameItem[];
};

export type AssociatedItemCard = {
  id: string;
  metaIndex: number;
  colIndex: number;
  indexInColumn: number;
};

export type LogListener = (lines: string[]) => void;

export interface ILogBus {
  append(line: string): void;
  clear(): void;
  get(): string[];
  subscribe(fn: LogListener): () => void;
}

export type SteamStatusResponse = {
  ok: boolean;
  connected: boolean;
  steam?: {
    webApiKey?: string; // masked as "***" from backend
    steamId?: string | null;
    linkedAt?: string | null;
  };
};

export type SteamWishlistResponse = {
  ok: boolean;
  lastSynced: string | null;
  items: any[]; // raw items for now; can type later if you want
};

