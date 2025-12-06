import type express from "express";
import { rootLog } from "../logger";

const log = rootLog.child("steamService");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SteamAuth = require("node-steam-openid");

const STEAM_REALM = process.env.STEAM_REALM || "http://localhost:3003";
const STEAM_RETURN_PATH = "/api/v1/steam/auth/callback";
const STEAM_RETURN_URL =
    process.env.STEAM_RETURN_URL || `${STEAM_REALM}${STEAM_RETURN_PATH}`;
const STEAM_WEB_API_KEY = process.env.STEAM_WEB_API_KEY || "532A3348740463C7E86093ED8BF7A230";

if (!STEAM_WEB_API_KEY) {
    log.warn("STEAM_WEB_API_KEY is not set – Steam Web API calls will fail");
}

const STEAM_API_BASE = "https://api.steampowered.com";
const STEAM_STORE_API_BASE = "https://store.steampowered.com/api";

interface AppDetails {
    appid: number;
    name: string;
    type: string;

    images: {
        // **Steam Client Library Covers**
        cover: string;
        cover2x: string;
        coverTall: string | null;
        // **Store API exposed images**
        header: string | null;
        capsule: string | null;
        capsulev5: string | null;
        capsuleSmall: string | null;
        capsuleLarge: string | null;
        // **Wallpapers / hero**
        wallpaper: string | null;
        hero: string | null;
        // **Other possible library artifacts if they exist**
        libraryCapsule: string | null;
        libraryLogo: string | null;
        libraryHero: string | null;
        // **Icon — almost always null from appdetails**
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
}

type WishlistEntry = {
    appid: number;
    priority: number;
    dateAdded: string;
    details?: AppDetails | null
};

export type SteamWishlistSnapshot = {
    lastSynced: string;
    items: WishlistEntry[];
};

// Get the Steam wishlist for a given SteamID
async function getWishlist(steamId: string): Promise<WishlistEntry[]> {
    if (!STEAM_WEB_API_KEY) {
        throw new Error("missing_steam_webapi_key");
    }

    const url =
        `${STEAM_API_BASE}/IWishlistService/GetWishlist/v1/` +
        `?key=${encodeURIComponent(STEAM_WEB_API_KEY)}` +
        `&steamid=${encodeURIComponent(steamId)}`;

    const res = await fetch(url);
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        log.warn("GetWishlist failed", { status: res.status, body });
        throw new Error("steam_wishlist_failed");
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

async function getWishlistDetails(
    wishlist: WishlistEntry[],
    onEntry: (entry: WishlistEntry) => void,
    cc: string,
    lang: string
): Promise<WishlistEntry[]> {
    const result: WishlistEntry[] = [];

    for (const w of wishlist) {
        const appid = w.appid;

        // Build the store API URL for this single app
        const url =
            `${STEAM_STORE_API_BASE}/appdetails` +
            `?appids=${encodeURIComponent(String(appid))}` +
            `&cc=${encodeURIComponent(cc)}` +
            `&l=${encodeURIComponent(lang)}`;

        let details: AppDetails | null = null;

        try {
            const res = await fetch(url, {
                headers: {
                    // Helps avoid some anti-bot blocks on store.steampowered.com
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

                        const coverBase = `https://steamcdn-a.akamaihd.net/steam/apps/${appid}`;
                        const coverImage = `${coverBase}/library_600x900.jpg`;
                        const coverImage2x = `${coverBase}/library_600x900_2x.jpg`;
                        const coverTall = `${coverBase}/library_hero.jpg`; // Some games use this newer variant

                        details = {
                            appid,
                            name: data.name,
                            type: data.type,

                            images: {
                                // **Steam Client Library Covers**
                                cover: coverImage,
                                cover2x: coverImage2x,
                                coverTall: coverTall,

                                // **Store API exposed images**
                                header: data.header_image ?? null,
                                capsule: data.capsule_image ?? null,
                                capsulev5: data.capsule_imagev5 ?? null,
                                capsuleSmall: data.small_capsule_image ?? null,
                                capsuleLarge: data.large_capsule_image ?? null,

                                // **Wallpapers / hero**
                                wallpaper: data.background_raw ?? data.background ?? null,
                                hero: data.library_assets?.library_hero ?? null,

                                // **Other possible library artifacts if they exist**
                                libraryCapsule: data.library_assets?.library_capsule ?? null,
                                libraryLogo: data.library_assets?.library_logo ?? null,
                                libraryHero: data.library_assets?.library_hero ?? null,

                                // **Icon — almost always null from appdetails**
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
                        };

                        log.info(`appdetails ${appid} ${data.name} fetched successfully`, { appid });

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
        // Be polite to the store API
        await delay(2000);
    }
    return result;
}

export const SteamService = {
    /**
     * Build the Steam OpenID redirect URL.
     * If linkToken is provided, it is included in openid.return_to so we can
     * map the callback back to a Syncnite account.
     */
    async getAuthRedirectUrl(linkToken?: string): Promise<string> {
        const returnUrl = linkToken
            ? `${STEAM_RETURN_URL}?linkToken=${encodeURIComponent(linkToken)}`
            : STEAM_RETURN_URL;

        const steamOpenId = new SteamAuth({
            realm: STEAM_REALM,
            returnUrl,
            apiKey: STEAM_WEB_API_KEY,
        });

        return await steamOpenId.getRedirectUrl();
    },

    /**
     * Authenticate the OpenID callback and return SteamID + minimal profile.
     * Uses the same returnUrl pattern (including linkToken if present) so that
     * node-steam-openid's return_to check passes.
     */
    async authenticateOpenId(req: express.Request): Promise<{
        steamId: string;
        profile: {
            personaname?: string;
            avatar?: string;
            avatarfull?: string;
            profileurl?: string;
        };
    }> {
        const linkToken = typeof req.query.linkToken === "string"
            ? req.query.linkToken
            : "";

        const expectedReturnUrl = linkToken
            ? `${STEAM_RETURN_URL}?linkToken=${encodeURIComponent(linkToken)}`
            : STEAM_RETURN_URL;

        const steamOpenId = new SteamAuth({
            realm: STEAM_REALM,
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

    // Get the wishlist with detailed app info
    async getWishlistWithDetails(
        steamId: string,
        cc = "NL",
        lang = "en",
        onEntry: (entry: WishlistEntry) => Promise<void> | void,
    ): Promise<WishlistEntry[]> {
        const wishlist = await getWishlist(steamId);
        if (!wishlist.length) return [];

        const result = await getWishlistDetails(wishlist, onEntry, cc, lang);

        return result;
    },
};
