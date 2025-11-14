export interface Series {
  Id: string;
  Name: string;
}

export interface Source {
  Id: string;
  Name: string;
}

export interface Tag {
  Id: string;
  Name: string;
}

export interface Platform {
  Id: string;
  Name: string;
  /** Some exports may include an icon path. */
  Icon?: string | null;
}

export interface GameLink {
  Name: string;
  Url: string;
}

export interface GameReleaseDate {
  /** ISO-8601 date string (yyyy-mm-dd) */
  ReleaseDate: string;
}

export interface Game {
  // identity
  Id: string;
  Name: string;
  SortingName?: string;

  // visibility / install
  Hidden?: boolean;
  IsInstalled?: boolean;
  InstallDirectory?: string | null;
  InstallSize?: number | null;

  // library identity
  PluginId?: string | null;
  GameId?: string | null;

  // joins (IDs to other collections)
  SourceId?: string | null;
  TagIds?: string[];
  PlatformIds?: string[];
  PrimaryPlatformId?: string | null;
  GenreIds?: string[];
  CategoryIds?: string[];
  FeatureIds?: string[];
  SeriesIds?: string[];
  PrimarySeriesId?: string | null;
  CompletionStatusId?: string | null;
  AgeRatingIds?: string[];
  RegionIds?: string[];
  DeveloperIds?: string[];
  PublisherIds?: string[];

  // dates + art
  ReleaseDate?: GameReleaseDate | null;
  ReleaseYear?: number | null;
  Icon?: string | null;
  CoverImage?: string | null;
  BackgroundImage?: string | null;

  // usage/activity
  Added?: string | null;        // ISO datetime with offset
  Modified?: string | null;     // ISO datetime with offset
  LastActivity?: string | null; // ISO datetime with offset
  Playtime?: number | null;     // minutes
  PlayCount?: number | null;

  // scores
  UserScore?: number | null;
  CommunityScore?: number | null;
  CriticScore?: number | null;

  // content
  Description?: string | null;
  Notes?: string | null;

  // links/actions/roms
  Links?: GameLink[];
  GameActions?: unknown[]; 
  Roms?: unknown[];   
}
