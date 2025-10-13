/** series.Series.json */
export interface Series {
  Id: string;
  Name: string;
}
export type SeriesJson = Series[];

/** sources.GameSource.json */
export interface GameSource {
  Id: string;
  Name: string;
}
export type GameSourceJson = GameSource[];

/** tags.Tag.json */
export interface Tag {
  Id: string;
  Name: string;
}
export type TagJson = Tag[];

/** platforms.Platform.json */
export interface Platform {
  Id: string;
  Name: string;
  /** Some exports may include an icon path. */
  Icon?: string | null;
}
export type PlatformJson = Platform[];

/** Common subtypes used in games.Game.json */
export interface GameLink {
  Name: string;
  Url: string;
}

export interface GameReleaseDate {
  /** ISO-8601 date string (yyyy-mm-dd) */
  ReleaseDate: string;
}

/** games.Game.json */
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

  // links/actions/roms (actions/roms omitted from sample exports, keep optional)
  Links?: GameLink[];
  // GameActions?: unknown[];
  // Roms?: unknown[];
}
export type GameJson = Game[];
