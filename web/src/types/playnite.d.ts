export interface PlayniteCompany {
  Id: string;
  Name: string;
}

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
  SourceId?: string | null;
  Hidden?: boolean;
  Description?: string | null;
  Notes?: string | null;
  ReleaseDate?: PlayniteGameReleaseDate | null;
  ReleaseYear?: number | null;
  Icon?: string | null;
  CoverImage?: string | null;
  BackgroundImage?: string | null;
  Links?: PlayniteGameLink[];

  TagIds?: string[];
  SeriesIds?: string[];
  DeveloperIds?: string[];

  PlatformIds?: string[];
  GenreIds?: string[];
  CategoryIds?: string[];
  FeatureIds?: string[];
  AgeRatingIds?: string[];
  RegionIds?: string[];
  PublisherIds?: string[];
  PluginId?: string | null;
  CompletionStatusId?: string | null;

  Added?: string | null;
  Modified?: string | null; 
  LastActivity?: string | null;
  Playtime?: number | null; 
  PlayCount?: number | null;
  UserScore?: number | null;
  CommunityScore?: number | null;
  CriticScore?: number | null;
  GameActions?: unknown[]; 
  Roms?: unknown[];   
}