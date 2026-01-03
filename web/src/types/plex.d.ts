export type PlexTag = { tag: string };

export interface PlexMetadata {
  ratingKey: string;
  librarySectionID?: string;
  type?: string;

  title?: string;
  titleSort?: string;
  summary?: string;
  year?: number;

  // media paths from PMS
  thumb?: string;
  art?: string;

  // taxonomy
  Genre?: PlexTag[] | PlexTag;
  Collection?: PlexTag[] | PlexTag;
  Label?: PlexTag[] | PlexTag;
  Category?: PlexTag[] | PlexTag;

  // show/episode fields
  grandparentTitle?: string;
  grandparentRatingKey?: string;
  parentIndex?: number; // season
  index?: number;       // episode

  // for audiobook parts + durations
  Media?: Array<{
    duration?: number;
    Part?: Array<{
      file?: string;
      duration?: number;
    }>;
  }>;

  // for clearLogo discovery (server uses this too)
  Image?: Array<{
    type?: string; // "clearLogo"
    url?: string;
  }>;

  originallyAvailableAt?: string;
  tagline?: string;
  studio?: string;
}

export type PlexStatusResponse = {
  ok: true;
  connected: boolean;
  serverUrl?: string;
  linkedAt?: string | null;
  lastSyncedAt?: string | null;
  lastSyncOk?: boolean | null;
  lastSyncError?: string | null;
};

