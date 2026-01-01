type PlexStatusResponse = {
    ok: true;
    connected: boolean;
    serverUrl?: string;
    linkedAt?: string | null;
    lastSyncedAt?: string | null;
    lastSyncOk?: boolean | null;
    lastSyncError?: string | null;
};