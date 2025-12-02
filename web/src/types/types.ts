import { LETTERS } from "../lib/constants";
import { GameLink } from "./playnite";

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

export interface UIState {
  q: string;
  setQ: React.Dispatch<React.SetStateAction<string>>;
  sources: string[];
  setSources: React.Dispatch<React.SetStateAction<string[]>>;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  series: string[];
  setSeries: React.Dispatch<React.SetStateAction<string[]>>;
  showHidden: boolean;
  setShowHidden: React.Dispatch<React.SetStateAction<boolean>>;
  sortKey: SortKey;
  sortDir: SortDir;
  setSortKey: React.Dispatch<React.SetStateAction<SortKey>>;
  onToggleSort: (key: SortKey) => void;
  installedOnly: boolean;
  setInstalledOnly: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UIDerivedState {
  filteredCount: number;
  totalCount: number;
  itemsSorted: GameItem[];
  itemsGroupedByLetter: ItemGroupedByLetter[];
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
  links: GameLink[] | null;
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

export interface Deck {
    key: string;
    label: string;
    items: GameItem[];
};

export type LogListener = (lines: string[]) => void;

export interface ILogBus {
    append(line: string): void;
    clear(): void;
    get(): string[];
    subscribe(fn: LogListener): () => void;
}
