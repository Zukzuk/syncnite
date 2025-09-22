export interface AppHeaderProps {
    opened: boolean;
    onToggleNav: () => void;
}

export type Guidish =
  | string
  | { $guid?: string }
  | { $oid?: string }
  | { Guid?: string }
  | { Value?: string }
  | null
  | undefined;

export type Link = {
  Name?: string;
  Url?: string
};

export type GameDoc = {
  _id?: Guidish;
  Id?: Guidish;
  Name?: string;
  TagIds?: Guidish[];
  SourceId?: Guidish;
  Hidden?: boolean;
  GameId?: string | number;
  Links?: Link[];
  Icon?: string;
  IconId?: Guidish;
  IsInstalled?: boolean;
};

export type NamedDoc = {
  _id?: Guidish;
  Id?: Guidish;
  Name?: string
};

export type Row = {
  id: string;
  title: string;
  sortingName: string;
  source: string;
  tags: string[];
  hidden: boolean;
  url: string | null;
  iconUrl: string;
  year?: number | null;
  raw: GameDoc;
  installed: boolean;
};

export type ZipInfo = {
  name: string;
  size: number;
  mtime: number
};

export type LibraryItem = {
  id: string | number;
  title: string;
  platform?: string;
  addedAt?: string;
  playtimeMinutes?: number;
};

export type StreamProgress = {
  phase?: "unzip" | "copy";
  percent?: number;
  copiedBytes?: number;
  totalBytes?: number;
  deltaBytes?: number;
  log?: string;
};

export type Persisted = {
  q: string;
  sources: string[];
  tags: string[];
  showHidden: boolean;
  installedOnly: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
};

export type Loaded = {
  rows: Row[];
  allSources: string[];
  allTags: string[];
};

export type Range = { startIndex: number; endIndex: number };

export type WithBucket = { row: Row; bucket: string };

export type AlphaGroup = { title: string; rows: Row[] };

export type AlphabeticalRailCounts = Record<string, number>;

export const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"] as const;
export type Letter = typeof LETTERS[number];

export type SortKey = "title" | "source" | "tags" | "year";

export type SortDir = "asc" | "desc";

export type BackupListener = (s: BackupWatcherState) => void;

export type LogListener = (lines: string[]) => void;

export type ZipMeta = { name: string; lastModified: number; size: number };

export type BackupWatcherState = {
  supported: boolean;
  dirName: string | null;
  latestLocalZip: ZipMeta | null;
  running: boolean;
  lastUploadedName: string | null;
  permission: PermissionState | "prompt" | null; // keep for compatibility with your types
};

export type Phase = null | "unzip" | "copy";

export type ImportState = {
    running: boolean;
    filename: string | null;
    phase: Phase;
    percent: number | null;
    subtext?: string;
};

export type UploadState = {
    running: boolean;
    name: string | null;
    percent: number | null;
};

