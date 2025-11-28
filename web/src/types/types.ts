import { LETTERS } from "../lib/constants";

export type SortKey = "title" | "series" | "year" | "source" | "tags";

export type SortDir = "asc" | "desc";

export type ViewMode = "list" | "grid";

export type Role = "admin" | "user" | "unknown";

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

export interface GameItem {
  id: string;
  title: string;
  sortingName: string | null;
  gameId: string;
  source: string;
  tags: string[];
  series: string[];
  isHidden: boolean;
  isInstalled: boolean;
  link: string | null;
  year: number | null;
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
