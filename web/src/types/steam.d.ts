
export type SteamStatusResponse = {
    ok: boolean;
    connected: boolean;
    steam?: {
        webApiKey: string;
        steamId?: string;
        linkedAt?: string;
    };
};

export type SteamWishlistResponse = {
    ok: boolean;
    lastSynced: string | null;
    items: SteamWishlistEntry[];
    syncInProgress: boolean;
};