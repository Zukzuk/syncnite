import { Dispatch, SetStateAction } from "react";
import { LETTERS } from "../constants";
import { InterLinkedGameItem } from "./interlinked";

declare global {
  interface Window { __APP_VERSION__?: string }
}

export type Letter = typeof LETTERS[number];

export type SortKey = "title" | "series" | "year" | "source" | "tags";

export type SortDir = "asc" | "desc";

export type ViewMode = "list" | "grid";

export type ColorScheme = "light" | "dark";

export type SwitchesMode = "enabled" | "disabled";

export type Role = "admin" | "user" | "unknown";

export type HistoryNavMode = "replace" | "push";

export type DesktopMode = "closed" | "mini" | "normal";

export type ButtonTypes = "button" | "submit" | "link";

export type CustomIconType = InterLinkedOrigin;

export type ItemIconOverlayType = "default" | "circle";

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
  sliderValue: number;
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
  resetAllFilters: () => void;
  sliderValue: number;
  setSliderValue: (value: number) => void;
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
  itemsAssociated: InterLinkedGameItem[];
  itemsSorted: InterLinkedGameItem[];
  itemsGroupedByLetter: ItemGroupedByLetter[];
};

export interface ItemGroupedByLetter {
  item: InterLinkedGameItem;
  itemLetter: Letter
};

export interface AlphabeticalGroup {
  items: InterLinkedGameItem[];
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

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
}

export type ScoredHit<T = string> = {
  item: T;
  score: number;
};

export type AssociatedLayout = {
  deckColumns: number;
  stackColumns: number;
  maxCardsPerDeckColumn: number;
};

export interface AssociatedItems {
  key: string;
  label: string;
  items: InterLinkedGameItem[];
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
    webApiKey: string;
    steamId?: string;
    linkedAt?: string;
  };
};

export type SteamWishlistResponse = {
  ok: boolean;
  lastSynced: string | null;
  items: SteamWishlistEntry[];
  syncInProgress: boolean;
};

export type DeckCardMeta = {
  id: string;
  metaIndex: number;
  colIndex: number;
  indexInColumn: number;
};

