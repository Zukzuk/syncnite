import type express from "express";
import crypto from "node:crypto";
import { rootLog } from "../logger";
import { AccountsService } from "./AccountsService";
import { type SteamAppDetails, type SteamWishlistSnapshot, type SteamWishlistEntry, SteamError } from "../types/types";
import {
    getSteamWishlistSnapshot,
    saveSteamWishlistSnapshot,
    appendSteamWishlistItemToFile,
} from "./SteamWishlistStore";
import { GameLink } from "../types/playnite";

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
const STEAM_WEB_API_KEY = process.env.STEAM_WEB_API_KEY || "";
if (!STEAM_WEB_API_KEY) {
    log.warn("STEAM_WEB_API_KEY is not set – Steam Web API calls will fail");
}

// Steam Web API endpoints
const STEAM_API_BASE = "https://api.steampowered.com";
const STEAM_STORE_API_BASE = "https://store.steampowered.com/api";
const LINK_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

// Fetches the Steam wishlist for the given SteamID
async function getWishlist(steamId: string): Promise<SteamWishlistEntry[]> {
    if (!STEAM_WEB_API_KEY) {
        throw new SteamError(500, "missing_steam_webapi_key");
    }

    const url =
        `${STEAM_API_BASE}/IWishlistService/GetWishlist/v1/` +
        `?key=${encodeURIComponent(STEAM_WEB_API_KEY)}` +
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

// Simple delay utility
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Extracts a four-digit year from a release date string
function extractYearFromReleaseDate(dateStr?: string | null): number | null {
    if (!dateStr) return null;
    const match = dateStr.match(/\b(\d{4})\b/);
    if (!match) return null;
    const year = Number(match[1]);
    return Number.isFinite(year) ? year : null;
}

// Fetches detailed info for each wishlist entry
async function getWishlistDetails(
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
                    "User-Agent": "Syncnite/1.0 (+https://syncnite.local)",
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

                if (json) {
                    const key = String(appid);
                    const entry = json[key];
                    if (!entry?.success || !entry.data) {
                        log.warn(`Wishlist item ${appid} missing or unsuccessful`, {
                            appid,
                            entry: entry ? { success: entry.success } : null,
                        });
                    } else {
                        const data = entry.data;
                        const storeUrl = `https://store.steampowered.com/app/${appid}`;
                        const year = extractYearFromReleaseDate(
                            data.release_date?.date,
                        );
                        const tags: string[] = [
                            ...(Array.isArray(data.genres)
                                ? data.genres.map((g: any) => String(g.description))
                                : []),
                            ...(Array.isArray(data.categories)
                                ? data.categories.map((c: any) => String(c.description))
                                : []),
                        ];
                        const series: string[] = [];
                        if (data.franchise) {
                            series.push(String(data.franchise));
                        }
                        const links: GameLink[] = [];
                        if (storeUrl) {
                            links.push({ Name: "Steam", Url: storeUrl });
                        }
                        if (data.website) {
                            links.push({ Name: "Website", Url: String(data.website) });
                        }
                        const coverBase = `https://steamcdn-a.akamaihd.net/steam/apps/${appid}`;
                        const coverImage = `${coverBase}/library_600x900.jpg`;
                        const coverImage2x = `${coverBase}/library_600x900_2x.jpg`;
                        const coverTall = `${coverBase}/library_hero.jpg`;

                        details = {
                            appid,
                            name: data.name,
                            type: data.type,
                            images: {
                                cover: coverImage,
                                cover2x: coverImage2x,
                                coverTall: coverTall,
                                header: data.header_image ?? null,
                                capsule: data.capsule_image ?? null,
                                capsulev5: data.capsule_imagev5 ?? null,
                                capsuleSmall: data.small_capsule_image ?? null,
                                capsuleLarge: data.large_capsule_image ?? null,
                                wallpaper: data.background ?? data.background_raw ?? null,
                                hero: data.library_assets?.library_hero ?? null,
                                libraryCapsule:
                                    data.library_assets?.library_capsule ?? null,
                                libraryLogo: data.library_assets?.library_logo ?? null,
                                libraryHero: data.library_assets?.library_hero ?? null,
                                icon: data.icon ?? data.icon_img ?? null,
                            },
                            price: data.price_overview
                                ? {
                                    currency: data.price_overview.currency,
                                    initial: data.price_overview.initial,
                                    final: data.price_overview.final,
                                    discountPercent:
                                        data.price_overview.discount_percent,
                                }
                                : null,
                            releaseDate: data.release_date
                                ? {
                                    date: data.release_date.date,
                                    comingSoon: Boolean(
                                        data.release_date.coming_soon,
                                    ),
                                }
                                : null,
                            link: storeUrl,
                            links: links.length ? links : null,
                            year,
                            tags,
                            series,
                            iconUrl:
                                data.capsule_imagev5 ??
                                data.capsule_image ??
                                null,
                            coverUrl: coverImage ?? coverImage2x ?? null,
                            bgUrl: data.background_raw ?? data.background ?? null,
                        };

                        log.info(
                            `Wishlist item ${appid} ${data.name} fetched successfully`,
                            { appid },
                        );
                    }
                }
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
    async getAuthRedirectUrl(linkToken?: string): Promise<string> {
        const returnUrl = linkToken
            ? `${STEAM_RETURN_URL}?linkToken=${encodeURIComponent(linkToken)}`
            : STEAM_RETURN_URL;

        const steamOpenId = new SteamAuth({
            realm: SERVER_REALM,
            returnUrl,
            apiKey: STEAM_WEB_API_KEY,
        });

        return await steamOpenId.getRedirectUrl();
    },

    /**
     * Authenticates a Steam OpenID request and returns the SteamID and profile.
     * @param req - Express request object
     */
    async authenticateOpenId(
        req: express.Request,
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
            apiKey: STEAM_WEB_API_KEY,
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
     * @param cc - country code for store localization (default: "NL")
     * @param lang - language code for store localization (default: "en")
     * @param onEntry - optional callback invoked for each entry as it's fetched
     */
    async getWishlistWithDetails(
        steamId: string,
        cc = "NL",
        lang = "en",
        onEntry: (entry: SteamWishlistEntry) => Promise<void> | void,
    ): Promise<SteamWishlistEntry[]> {
        const wishlist = await getWishlist(steamId);
        if (!wishlist.length) return [];
        return await getWishlistDetails(wishlist, onEntry, cc, lang);
    },

    /**
     * Gets the Steam connection status for the given email/account.
     * @param email - email/account to check
     * @param steam - steam connection info
     */
    async getConnectionStatus(email: string): Promise<{
        connected: boolean;
        steam?: { steamId: string; linkedAt: string };
    }> {
        const acc = await AccountsService.getAccount(email);
        if (!acc) {
            throw new SteamError(404, "not_found");
        }

        if (!acc.steam) {
            return { connected: false };
        }

        return {
            connected: true,
            steam: {
                steamId: acc.steam.steamId,
                linkedAt: acc.steam.linkedAt,
            },
        };
    },

    /**
     * Starts the Steam OpenID authentication process for the given email/account.
     * @param email - email/account to link Steam with
     */
    async startAuthForEmail(email: string): Promise<{ redirectUrl: string }> {
        try {
            const token = createLinkToken(email);
            const redirectUrl = await this.getAuthRedirectUrl(token);

            log.info("steam auth start", { email, token });

            return { redirectUrl };
        } catch (e: any) {
            log.warn("steam auth start failed", { err: String(e?.message ?? e) });
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

            const { steamId } = await this.authenticateOpenId(req);

            const linkedAt = new Date().toISOString();
            const r = await AccountsService.setSteamConnection(email, {
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
        if (!acc || !acc.steam) {
            throw new SteamError(400, "steam_not_linked");
        }

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

        // 1. Immediately mark sync as in-progress, keep current items for now
        const inProgressSnapshot: SteamWishlistSnapshot = {
            lastSynced: existingSnapshot?.lastSynced ?? now,
            items: existingSnapshot?.items ?? [],
            syncInProgress: true,
        };

        await saveSteamWishlistSnapshot(email, inProgressSnapshot);

        // Background delta sync
        void (async () => {
            try {
                // 2. Fetch current Steam wishlist (core info only)
                const remoteWishlist = await getWishlist(acc.steam!.steamId);

                const existingItems = existingSnapshot?.items ?? [];
                const existingMap = new Map<number, SteamWishlistEntry>(
                    existingItems.map((i: SteamWishlistEntry) => [i.appid, i]),
                );

                // 3. Keep only entries that are still on Steam (remove deleted appids)
                const kept: SteamWishlistEntry[] = [];
                for (const remote of remoteWishlist) {
                    const existing = existingMap.get(remote.appid);
                    if (existing) {
                        kept.push({
                            ...existing,
                            priority: remote.priority,
                            dateAdded: remote.dateAdded,
                        });
                    }
                }

                // 4. Write snapshot with "kept" only (this reflects deletions immediately)
                const afterDeleteTime = new Date().toISOString();
                const afterDeleteSnapshot: SteamWishlistSnapshot = {
                    lastSynced: afterDeleteTime,
                    items: kept,
                    syncInProgress: true,
                };
                await saveSteamWishlistSnapshot(email, afterDeleteSnapshot);

                // 5. Determine truly new items (present on Steam, absent locally)
                const newEntriesCore = remoteWishlist.filter(
                    (w) => !existingMap.has(w.appid),
                );

                let detailedNew: SteamWishlistEntry[] = [];

                if (newEntriesCore.length > 0) {
                    // Fetch details only for the delta,
                    // and append each entry as soon as it's fetched.
                    detailedNew = await getWishlistDetails(
                        newEntriesCore,
                        async (entryWithDetails) => {
                            await appendSteamWishlistItemToFile(
                                email,
                                entryWithDetails,
                            );
                        },
                        "NL",
                        "en",
                    );
                }

                // 6. Build final ordered list according to remoteWishlist
                const detailedNewMap = new Map<number, SteamWishlistEntry>(
                    detailedNew.map((e) => [e.appid, e]),
                );
                const keptMap = new Map<number, SteamWishlistEntry>(
                    kept.map((e) => [e.appid, e]),
                );

                const finalItems: SteamWishlistEntry[] = [];
                for (const remote of remoteWishlist) {
                    const fromNew = detailedNewMap.get(remote.appid);
                    const fromKept = keptMap.get(remote.appid);

                    if (fromNew) {
                        finalItems.push(fromNew);
                    } else if (fromKept) {
                        finalItems.push(fromKept);
                    }
                }

                // 7. Final snapshot: syncInProgress = false
                const finalSnapshot: SteamWishlistSnapshot = {
                    lastSynced: new Date().toISOString(),
                    items: finalItems,
                    syncInProgress: false,
                };

                await saveSteamWishlistSnapshot(email, finalSnapshot);

                log.info("steam wishlist delta sync completed", {
                    email,
                    removedCount: existingItems.length - kept.length,
                    addedCount: detailedNew.length,
                });
            } catch (e: any) {
                log.warn("Delta wishlist sync failed", {
                    email,
                    err: String(e?.message ?? e),
                });

                // best effort unlock
                const current = await getSteamWishlistSnapshot(email);
                if (current) {
                    const fallback: SteamWishlistSnapshot = {
                        lastSynced: current.lastSynced,
                        items: current.items ?? [],
                        syncInProgress: false,
                    };
                    await saveSteamWishlistSnapshot(email, fallback);
                }
            }
        })();

        // Immediate response: whatever we just stored with syncInProgress: true
        return {
            lastSynced: inProgressSnapshot.lastSynced,
            items: inProgressSnapshot.items,
            syncInProgress: true,
        };
    },
};
