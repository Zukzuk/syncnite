export interface PlexConnection {
    /** Base URL of PMS, e.g. http://192.168.1.124:32400 */
    serverUrl: string;

    /** Plex account token (X-Plex-Token) obtained via PIN flow */
    token?: string | null;

    /** Stable identifier for this app instance (stored & reused) */
    clientIdentifier: string;

    /** When linked */
    linkedAt?: string | null;

    /** Last sync audit */
    lastSyncedAt?: string | null;
    lastSyncOk?: boolean | null;
    lastSyncError?: string | null;

    /** Optional: last PIN flow state (for UX / resume) */
    lastPinId?: number | null;
    lastPinCode?: string | null;
}

export type PlexSnapshot = {
  UpdatedAt: string;
  Source: "plex-sync";
  ServerUrl: string;

  DbTicks: number; // max of all DbVersions
  Sections: Record<string, { Title: string; Type: string | null; DbTicks: number; ItemCount: number }>;

  DbVersions: Record<string, number>;       // key: `${sectionKey}:${ratingKey}` -> updatedAt
  MediaVersions: Record<string, number>;    // key: `${sectionKey}:${ratingKey}:${kind}` -> version
};

export type PlexMediaKind = "thumb" | "art" | "clearLogo";