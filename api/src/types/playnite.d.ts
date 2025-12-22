export interface PlayniteSeries {
  Id: string;
  Name: string;
}

export interface PlayniteSource {
  Id: string;
  Name: string;
}

export interface PlayniteTag {
  Id: string;
  Name: string;
}

interface PlaynitePlatform {
  Id: string;
  Name: string;
  /** Some exports may include an icon path. */
  Icon?: string | null;
}

export interface PlayniteGameLink {
  Name: string;
  Url: string;
}

export interface PlayniteGameReleaseDate {
  /** ISO-8601 date string (yyyy-mm-dd) */
  ReleaseDate: string;
}

export interface PlayniteGame {
  // identity
  Id: string;
  Name: string;
  SortingName?: string;
  GameId: string;
  Version?: string;

  // visibility
  Hidden?: boolean;

  // joins (IDs to other collections)
  SourceId?: string | null;
  TagIds?: string[];
  PlatformIds?: string[];
  GenreIds?: string[];
  CategoryIds?: string[];
  FeatureIds?: string[];
  SeriesIds?: string[];
  CompletionStatusId?: string | null;
  AgeRatingIds?: string[];
  RegionIds?: string[];
  DeveloperIds?: string[];
  PublisherIds?: string[];
  PluginId?: string | null;

  // dates + art
  ReleaseDate?: PlayniteGameReleaseDate | null;
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
  Links?: PlayniteGameLink[];
  GameActions?: unknown[];
  Roms?: unknown[];
}
