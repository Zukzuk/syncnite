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

// export type Row = {
//     id: string;
//     title: string;
//     hidden: boolean;
//     installed: boolean;
//     iconUrl?: string | null;
//     source?: string | null;
//     tags?: string[] | null;
//     year?: number | null;
//     url?: string | null;
// };

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

export type GameRowProps = {
  id: string;
  hidden: boolean;
  showHidden: boolean;
  installed: boolean;
  iconUrl: string;
  title: string;
  source: string;
  tags: string[];
  year?: number | null;
  url: string | null;
};

export type Loaded = {
  rows: Row[];
  allSources: string[];
  allTags: string[];
};

export type WithBucket = { row: Row; bucket: string };

export type AlphaGroup = { title: string; rows: Row[] };

export type AlphabeticalRailCounts = Record<string, number>;

export const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"] as const;
export type Letter = typeof LETTERS[number];

export type SortKey = "title" | "source" | "tags" | "year";
export type SortDir = "asc" | "desc";
