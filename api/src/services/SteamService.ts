import type express from "express";
import crypto from "node:crypto";
import { rootLog } from "../logger";
import { GameLink } from "../types/playnite";
import { AccountsService } from "./AccountsService";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SteamAuth = require("node-steam-openid");
const log = rootLog.child("steamService");

// Base URL of your web frontend (what Steam redirects back to)
// e.g. http://localhost:3003 in dev, https://your.domain.tld in prod
const SERVER_REALM = process.env.SERVER_REALM;
if (!SERVER_REALM) {
    throw new Error("SERVER_REALM is not set");
}

const STEAM_RETURN_PATH = process.env.STEAM_RETURN_PATH;

// Optional override; by default we just use realm + path
const STEAM_RETURN_URL = `${SERVER_REALM}${STEAM_RETURN_PATH}`;

// Steam Web API key: MUST be set via environment
const STEAM_WEB_API_KEY = process.env.STEAM_WEB_API_KEY || "";
if (!STEAM_WEB_API_KEY) {
    log.warn("STEAM_WEB_API_KEY is not set – Steam Web API calls will fail");
}

const STEAM_API_BASE = "https://api.steampowered.com";
const STEAM_STORE_API_BASE = "https://store.steampowered.com/api";
const LINK_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

export class SteamError extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message?: string) {
        super(message ?? code);
        this.status = status;
        this.code = code;
    }
}

interface AppDetails {
    appid: number;
    name: string;
    type: string;

    images: {
        cover: string;
        cover2x: string;
        coverTall: string | null;

        header: string | null;
        capsule: string | null;
        capsulev5: string | null;
        capsuleSmall: string | null;
        capsuleLarge: string | null;

        wallpaper: string | null;
        hero: string | null;

        libraryCapsule: string | null;
        libraryLogo: string | null;
        libraryHero: string | null;

        icon: string | null;
    };

    price: {
        currency: string;
        initial: number;
        final: number;
        discountPercent: number;
    } | null;

    releaseDate: {
        date: string;
        comingSoon: boolean;
    } | null;

    /** GameItem–aligned derived fields */
    link: string | null;
    links: GameLink[] | null;
    year: number | null;
    tags: string[];
    series: string[];
    iconUrl: string | null;
    coverUrl: string | null;
    bgUrl: string | null;
}

type WishlistEntry = {
    appid: number;
    priority: number;
    dateAdded: string;
    details?: AppDetails | null;
};

export type SteamWishlistSnapshot = {
    lastSynced: string;
    items: WishlistEntry[];
};

// In-memory link-token store: linkToken -> { email, createdAt }
const linkTokens = new Map<string, { email: string; createdAt: number }>();

function createLinkToken(email: string): string {
    const token = crypto.randomBytes(16).toString("hex");
    linkTokens.set(token, { email, createdAt: Date.now() });
    return token;
}

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

async function getWishlist(steamId: string): Promise<WishlistEntry[]> {
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractYearFromReleaseDate(dateStr?: string | null): number | null {
    if (!dateStr) return null;
    const match = dateStr.match(/\b(\d{4})\b/);
    if (!match) return null;
    const year = Number(match[1]);
    return Number.isFinite(year) ? year : null;
}

async function getWishlistDetails(
    wishlist: WishlistEntry[],
    onEntry: (entry: WishlistEntry) => void,
    cc: string,
    lang: string
): Promise<WishlistEntry[]> {
    const result: WishlistEntry[] = [];

    for (const w of wishlist) {
        const appid = w.appid;

        const url =
            `${STEAM_STORE_API_BASE}/appdetails` +
            `?appids=${encodeURIComponent(String(appid))}` +
            `&cc=${encodeURIComponent(cc)}` +
            `&l=${encodeURIComponent(lang)}`;

        let details: AppDetails | null = null;

        try {
            const res = await fetch(url, {
                headers: {
                    "User-Agent": "Syncnite/1.0 (+https://syncnite.local)",
                },
            });

            if (!res.ok) {
                const body = await res.text().catch(() => "");
                log.warn(`appdetails ${appid} single failed`, {
                    appid,
                    status: res.status,
                    body,
                });
            } else {
                let json: any;
                try {
                    json = await res.json();
                } catch (e: any) {
                    log.warn(`appdetails ${appid} json parse failed`, {
                        appid,
                        err: String(e?.message ?? e),
                    });
                    json = null;
                }

                if (json) {
                    const key = String(appid);
                    const entry = json[key];
                    if (!entry?.success || !entry.data) {
                        log.warn(`appdetails ${appid} missing or unsuccessful`, {
                            appid,
                            entry: entry ? { success: entry.success } : null,
                        });
                    } else {
                        const data = entry.data;
                        const storeUrl = `https://store.steampowered.com/app/${appid}`;
                        const year = extractYearFromReleaseDate(data.release_date?.date);
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
                                libraryCapsule: data.library_assets?.library_capsule ?? null,
                                libraryLogo: data.library_assets?.library_logo ?? null,
                                libraryHero: data.library_assets?.library_hero ?? null,
                                icon: data.icon ?? data.icon_img ?? null,
                            },

                            price: data.price_overview
                                ? {
                                    currency: data.price_overview.currency,
                                    initial: data.price_overview.initial,
                                    final: data.price_overview.final,
                                    discountPercent: data.price_overview.discount_percent,
                                }
                                : null,

                            releaseDate: data.release_date
                                ? {
                                    date: data.release_date.date,
                                    comingSoon: Boolean(data.release_date.coming_soon),
                                }
                                : null,
                            link: storeUrl,
                            links: links.length ? links : null,
                            year,
                            tags,
                            series,
                            iconUrl: data.capsule_imagev5 ?? data.capsule_image ?? null,
                            coverUrl: coverImage ?? coverImage2x ?? null,
                            bgUrl: data.background_raw ?? data.background ?? null,
                        };

                        log.info(`appdetails ${appid} ${data.name} fetched successfully`, {
                            appid,
                        });
                    }
                }
            }
        } catch (e: any) {
            log.warn("appdetails request error", {
                appid,
                err: String(e?.message ?? e),
            });
        }

        const entryWithDetails: WishlistEntry = {
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

export const SteamService = {

    // Steam OpenID operation
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

    // Authenticate the OpenID response and return the SteamID and profile info
    async authenticateOpenId(req: express.Request): Promise<{
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

    // Wishlist operations
    async getWishlistWithDetails(
        steamId: string,
        cc = "NL",
        lang = "en",
        onEntry: (entry: WishlistEntry) => Promise<void> | void
    ): Promise<WishlistEntry[]> {
        const wishlist = await getWishlist(steamId);
        if (!wishlist.length) return [];
        return await getWishlistDetails(wishlist, onEntry, cc, lang);
    },

    // App / account-level operations used by routes
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

    // Starts the Steam OpenID flow for the given email/account
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

    // Handles the Steam OpenID callback and links the Steam account
    async handleAuthCallback(req: express.Request): Promise<{ redirectTo: string }> {
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
                log.warn("setSteamConnection failed", { email, steamId, error: r.error });
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
            log.warn("steam auth callback failed", { err: String(e?.message ?? e) });
            throw new SteamError(401, "steam_authentication_failed");
        }
    },

    // Wishlist operations at account level
    async getWishlistSnapshot(email: string): Promise<{
        lastSynced: string | null;
        items: WishlistEntry[];
    }> {
        const acc = await AccountsService.getAccount(email);
        if (!acc) {
            throw new SteamError(404, "not_found");
        }

        const snapshot = await AccountsService.getSteamWishlistFile(email);

        if (!snapshot) {
            return {
                lastSynced: null,
                items: [],
            };
        }

        return {
            lastSynced: snapshot.lastSynced ?? null,
            items: snapshot.items ?? [],
        };
    },

    // Starts a background Steam wishlist sync
    async startWishlistSync(email: string): Promise<{
        lastSynced: string;
        items: WishlistEntry[];
    }> {
        const acc = await AccountsService.getAccount(email);
        if (!acc || !acc.steam) {
            throw new SteamError(400, "steam_not_linked");
        }

        const startedAt = new Date().toISOString();

        const initSnapshot = {
            lastSynced: startedAt,
            items: [] as WishlistEntry[],
        };

        const r = await AccountsService.setSteamWishlistFile(email, initSnapshot);
        if (!r.ok) {
            throw new SteamError(500, r.error ?? "wishlist_snapshot_init_failed");
        }

        // Fire-and-forget background job
        void (async () => {
            try {
                await SteamService.getWishlistWithDetails(
                    acc.steam!.steamId,
                    "NL",
                    "en",
                    async (entry) => {
                        await AccountsService.appendSteamWishlistItem(email, entry);
                    }
                );
                log.info("steam wishlist sync completed", { email });
            } catch (e: any) {
                log.warn("background steam wishlist sync failed", {
                    email,
                    err: String(e?.message ?? e),
                });
            }
        })();

        return {
            lastSynced: startedAt,
            items: [],
        };
    },
};
