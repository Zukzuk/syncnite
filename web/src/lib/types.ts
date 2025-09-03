export type Guidish =
  | string
  | { $guid?: string }
  | { $oid?: string }
  | { Guid?: string }
  | { Value?: string }
  | null
  | undefined;

export type Link = { Name?: string; Url?: string };

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
};

export type NamedDoc = { _id?: Guidish; Id?: Guidish; Name?: string };

export type Row = {
  id: string;
  title: string;
  sortingName: string;
  source: string;
  tags: string[];
  hidden: boolean;
  url: string | null;
  iconUrl: string;
  raw: GameDoc;
};

export type SortKey = "title" | "source" | "tags";
export type SortDir = "asc" | "desc";
