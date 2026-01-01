import type express from "express";
import crypto from "node:crypto";
import { rootLog } from "../logger";
import { AccountsService } from "./AccountsService";
import { WorkerService } from "./WorkerService";
import { getSteamWishlistSnapshot, parseWishlistResult, saveSteamWishlistSnapshot } from "./SteamWishlistStore";
import { SteamAppDetails, SteamError, SteamWishlistEntry, SteamWishlistSnapshot } from "../types/steam";

// https://steamapi.xpaw.me/
// https://api.steampowered.com/IWishlistService/GetWishlist/v1/
// https://store.steampowered.com/api/appdetails?appids=

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SteamAuth = require("node-steam-openid");
const log = rootLog.child("steamService");

// Base URL of your web frontend
const SERVER_REALM = process.env.SERVER_REALM;
if (!SERVER_REALM) {
    throw new Error("SERVER_REALM is not set");
}

// Steam OpenID return URL
const STEAM_RETURN_PATH = process.env.STEAM_RETURN_PATH;
const STEAM_RETURN_URL = `${SERVER_REALM}${STEAM_RETURN_PATH}`;

// Steam Web API endpoints
const STEAM_API_BASE = "https://api.steampowered.com";
const STEAM_STORE_API_BASE = "https://store.steampowered.com/api";
const LINK_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Simple delay utility
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory link-token store: linkToken -> { email, createdAt }
const linkTokens = new Map<string, { email: string; createdAt: number }>();

// Creates a link token for the given email/account
function createLinkToken(email: string): string {
    const token = crypto.randomBytes(16).toString("hex");
    linkTokens.set(token, { email, createdAt: Date.now() });
    return token;
}

// Consumes a link token and returns the associated email/account
function consumeLinkToken(token: string): string | null {
    const entry = linkTokens.get(token);
    if (!entry) return null;
    linkTokens.delete(token);

    if (Date.now() - entry.createdAt > LINK_TOKEN_TTL_MS) {
        log.warn("link token expired", { token, email: entry.email });
        return null;
    }

    return entry.email;
}

/**
 * Extracts the year from a release date string.
 * @param dateStr - release date string
 * @return year as number or null if not found 
 */
export function extractYearFromReleaseDate(dateStr?: string | null): number | null {
    if (!dateStr) return null;
    const match = dateStr.match(/\b(\d{4})\b/);
    if (!match) return null;
    const year = Number(match[1]);
    return Number.isFinite(year) ? year : null;
}

/**
 * Fetches the Steam wishlist (core info only) for the given SteamID.
 * @param steamId - SteamID to fetch wishlist for
 * @param apiKey - Steam Web API key
 * @return list of wishlist entries
 */
export async function getWishlistFromSteam(steamId: string, apiKey: string): Promise<SteamWishlistEntry[]> {
    if (!apiKey) {
        throw new SteamError(500, "missing_steam_webapi_key");
    }

    const url =
        `${STEAM_API_BASE}/IWishlistService/GetWishlist/v1/` +
        `?key=${encodeURIComponent(apiKey)}` +
        `&steamid=${encodeURIComponent(steamId)}`;

    const res = await fetch(url);
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        log.warn("GetWishlist failed", { status: res.status, body });
        throw new SteamError(502, "steam_wishlist_failed");
    }

    const json: any = await res.json();
    const items: any[] = json?.response?.items ?? [];

    return items.map((x) => ({
        appid: Number(x.appid),
        priority: Number(x.priority ?? 0),
        dateAdded: new Date(Number(x.date_added) * 1000).toISOString(),
    }));
}

/**
 * Fetches detailed info for each wishlist entry. Invokes onEntry callback for each entry as it's fetched.
 * @param wishlist - list of wishlist entries (core info only)
 * @param onEntry - optional callback invoked for each entry as it's fetched
 * @param cc - country code for store localization (default: "NL")
 * @param lang - language code for store localization (default: "en")
 */
export async function getWishlistDetailsFromSteam(
    wishlist: SteamWishlistEntry[],
    onEntry: (entry: SteamWishlistEntry) => void | Promise<void>,
    cc: string,
    lang: string,
): Promise<SteamWishlistEntry[]> {
    const result: SteamWishlistEntry[] = [];

    for (const w of wishlist) {
        const appid = w.appid;

        const url =
            `${STEAM_STORE_API_BASE}/appdetails` +
            `?appids=${encodeURIComponent(String(appid))}` +
            `&cc=${encodeURIComponent(cc)}` +
            `&l=${encodeURIComponent(lang)}`;

        let details: SteamAppDetails | null = null;

        try {
            const res = await fetch(url, {
                headers: {
                    "User-Agent": "interlinked/1.0 (+https://interlinked.local)",
                },
            });

            if (!res.ok) {
                const body = await res.text().catch(() => "");
                log.warn(`Wishlist item ${appid} single failed`, {
                    appid,
                    status: res.status,
                    body,
                });
            } else {
                let json: any;
                try {
                    json = await res.json();
                } catch (e: any) {
                    log.warn(`Wishlist item ${appid} json parse failed`, {
                        appid,
                        err: String(e?.message ?? e),
                    });
                    json = null;
                }
                details = await parseWishlistResult(json, appid);
            }
        } catch (e: any) {
            log.warn("Wishlist item request error", {
                appid,
                err: String(e?.message ?? e),
            });
        }

        const entryWithDetails: SteamWishlistEntry = {
            ...w,
            details,
        };

        result.push(entryWithDetails);

        if (onEntry) {
            try {
                await onEntry(entryWithDetails);
            } catch (e: any) {
                log.warn("onEntry callback failed for wishlist item", {
                    appid,
                    err: String(e?.message ?? e),
                });
            }
        }

        await delay(2000);
    }

    return result;
}

// Steam service class
export const SteamService = {
    /**
     * Gets the Steam OpenID authentication redirect URL.
     * @param linkToken - optional link token to include in return URL
     */
    async getAuthRedirectUrl(apiKey: string, linkToken?: string): Promise<string> {
        const returnUrl = linkToken
            ? `${STEAM_RETURN_URL}?linkToken=${encodeURIComponent(linkToken)}`
            : STEAM_RETURN_URL;

        const steamOpenId = new SteamAuth({
            realm: SERVER_REALM,
            returnUrl,
            apiKey,
        });

        return await steamOpenId.getRedirectUrl();
    },

    /**
     * Authenticates a Steam OpenID request and returns the SteamID and profile.
     * @param req - Express request object
     */
    async authenticateOpenId(
        req: express.Request,
        apiKey: string,
    ): Promise<{
        steamId: string;
        profile: {
            personaname?: string;
            avatar?: string;
            avatarfull?: string;
            profileurl?: string;
        };
    }> {
        const linkToken =
            typeof req.query.linkToken === "string" ? req.query.linkToken : "";

        const expectedReturnUrl = linkToken
            ? `${STEAM_RETURN_URL}?linkToken=${encodeURIComponent(linkToken)}`
            : STEAM_RETURN_URL;

        const steamOpenId = new SteamAuth({
            realm: SERVER_REALM,
            returnUrl: expectedReturnUrl,
            apiKey,
        });

        const user = await steamOpenId.authenticate(req);

        const steamId = String(user.steamid);
        const profile = {
            personaname: user.personaname,
            avatar: user.avatar,
            avatarfull: user.avatarfull,
            profileurl: user.profileurl,
        };

        log.info("steam openid authenticated", { steamId });

        return { steamId, profile };
    },

    /**
     * Gets the Steam wishlist with detailed info for the given SteamID.
     * @param steamId - SteamID to fetch wishlist for
     * @param apiKey - Steam Web API key
     * @param cc - country code for store localization (default: "NL")
     * @param lang - language code for store localization (default: "en")
     * @param onEntry - optional callback invoked for each entry as it's fetched
     */
    async getWishlistWithDetails(
        steamId: string,
        apiKey: string,
        cc = "NL",
        lang = "en",
        onEntry: (entry: SteamWishlistEntry) => Promise<void> | void,
    ): Promise<SteamWishlistEntry[]> {
        const wishlist = await getWishlistFromSteam(steamId, apiKey);
        if (!wishlist.length) return [];
        return await getWishlistDetailsFromSteam(wishlist, onEntry, cc, lang);
    },

    /**
     * Gets the Steam connection status for the given email/account.
     * @param email - email/account to check
     * @param steam - steam connection info
     */
    async getConnectionStatus(email: string): Promise<{
        connected: boolean;
        steam?: { apiKey: string; steamId?: string; linkedAt?: string };
    }> {
        const acc = await AccountsService.getAccount(email);
        if (!acc) throw new SteamError(404, "not_found");

        if (!acc.steam) return { connected: false };

        return {
            connected: Boolean(acc.steam.steamId),
            steam: {
                apiKey: acc.steam.apiKey,
                steamId: acc.steam.steamId,
                linkedAt: acc.steam.linkedAt,
            },
        };
    },

    /**
     * Starts the Steam OpenID authentication process for the given email/account.
     * @param email - email/account to link Steam with
     * @param apiKey - Steam Web API key
     */
    async startAuthForEmail(email: string, apiKey: string): Promise<{ redirectUrl: string }> {
        try {
            // persist apiKey on account (steam connection) BEFORE redirecting
            const r = await AccountsService.setSteamConnection(email, { apiKey });
            if (!r.ok) throw new SteamError(500, "persist_steam_connection_failed");

            const token = createLinkToken(email);
            const redirectUrl = await this.getAuthRedirectUrl(apiKey, token);

            log.info("steam auth start", { email, token });
            return { redirectUrl };
        } catch (e: any) {
            log.warn("steam auth start failed", { err: String(e?.message ?? e) });
            if (e instanceof SteamError) throw e;
            throw new SteamError(500, "steam_auth_start_failed");
        }
    },

    /**
     * Handles the Steam OpenID authentication callback.
     * @param req - Express request object
     */
    async handleAuthCallback(
        req: express.Request,
    ): Promise<{ redirectTo: string }> {
        try {
            const linkToken =
                typeof req.query.linkToken === "string" ? req.query.linkToken : "";

            if (!linkToken) {
                log.warn("steam callback missing linkToken");
                throw new SteamError(400, "missing_link_token");
            }

            const email = consumeLinkToken(linkToken);
            if (!email) {
                log.warn("steam callback invalid/expired linkToken", { linkToken });
                throw new SteamError(400, "invalid_or_expired_link_token");
            }

            const acc = await AccountsService.getAccount(email);
            const apiKey = String(acc?.steam?.apiKey ?? "").trim();
            if (!apiKey) {
                throw new SteamError(400, "missing_steam_webapi_key");
            }

            const { steamId } = await this.authenticateOpenId(req, apiKey);

            const linkedAt = new Date().toISOString();
            const r = await AccountsService.setSteamConnection(email, {
                apiKey,
                steamId,
                linkedAt,
            });

            if (!r.ok) {
                log.warn("setSteamConnection failed", {
                    email,
                    steamId,
                    error: r.error,
                });
                throw new SteamError(500, "persist_steam_connection_failed");
            }

            log.info("steam linked", { email, steamId });

            const redirectTo =
                process.env.STEAM_LINK_REDIRECT || "/account?steamLinked=1";

            return { redirectTo };
        } catch (e: any) {
            if (e instanceof SteamError) {
                throw e;
            }
            log.warn("steam auth callback failed", {
                err: String(e?.message ?? e),
            });
            throw new SteamError(401, "steam_authentication_failed");
        }
    },

    /**
     * Gets the Steam wishlist snapshot for the given email/account.
     * @param email - email/account to get wishlist for
     * @param items - wishlist items
     * @param syncInProgress - whether a sync is in progress
     */
    async getWishlistSnapshot(email: string): Promise<{
        lastSynced: string;
        items: SteamWishlistEntry[];
        syncInProgress: boolean;
    }> {
        const acc = await AccountsService.getAccount(email);
        if (!acc) {
            throw new SteamError(404, "not_found");
        }

        const snapshot = await getSteamWishlistSnapshot(email);

        if (!snapshot) {
            return {
                lastSynced: "",
                items: [],
                syncInProgress: false,
            };
        }

        return {
            lastSynced: snapshot.lastSynced,
            items: snapshot.items ?? [],
            syncInProgress: Boolean(snapshot.syncInProgress),
        };
    },

    /**
     * Starts a Steam wishlist sync for the given email/account.
     * @param email - email/account to sync wishlist for
     * @param items - wishlist items
     * @param syncInProgress - whether a sync is in progress
     */
    async startWishlistSync(email: string): Promise<{
        lastSynced: string;
        items: SteamWishlistEntry[];
        syncInProgress: boolean;
    }> {
        const acc = await AccountsService.getAccount(email);
        if (!acc || !acc.steam) throw new SteamError(400, "steam_not_linked");

        const steamId = String(acc.steam.steamId ?? "").trim();
        if (!steamId) throw new SteamError(400, "steam_not_linked");

        const apiKey = String(acc.steam.apiKey ?? "").trim();
        if (!apiKey) throw new SteamError(400, "missing_steam_webapi_key");

        const existingSnapshot = await getSteamWishlistSnapshot(email);
        const now = new Date().toISOString();

        // If sync already running → return the current snapshot
        if (existingSnapshot?.syncInProgress) {
            return {
                lastSynced: existingSnapshot.lastSynced ?? now,
                items: existingSnapshot.items ?? [],
                syncInProgress: true,
            };
        }

        // 1) Immediately mark sync as in-progress, keep current items for now
        const inProgressSnapshot: SteamWishlistSnapshot = {
            lastSynced: existingSnapshot?.lastSynced ?? now,
            items: existingSnapshot?.items ?? [],
            syncInProgress: true,
        };

        await saveSteamWishlistSnapshot(email, inProgressSnapshot);

        // 2) Kick off background delta sync via the new service
        void WorkerService.steamWishlistUpdateCrawl(email, steamId, apiKey);

        // Immediate response
        return {
            lastSynced: inProgressSnapshot.lastSynced,
            items: inProgressSnapshot.items,
            syncInProgress: true,
        };
    },
};
