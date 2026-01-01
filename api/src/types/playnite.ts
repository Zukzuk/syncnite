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

export class PlayniteError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export type PlayniteClientManifest = {
  json?: Record<string, string[]>;
  versions?: Record<string, Record<string, string>>;
  installed?: { count: number; hash?: string };
  mediaFolders?: Record<string, number>;
};

export type PlayniteDeltaManifest = {
  toUpsert: Record<string, string[]>;
  toDelete: Record<string, string[]>;
  media?: {
    uploadFolders: string[];
  };
};

export type InstalledStateRow = {
  id: string;
  isInstalled: boolean;
  installDirectory?: string;
  installSize?: number | null;
};
