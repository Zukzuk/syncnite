import { promises as fs } from "node:fs";
import { join } from "node:path";
import { STEAM_WISHLIST_ROOT, WISHLIST_SUFFIX } from "../constants";
import { SteamWishlistSnapshot, SteamWishlistEntry, SteamAppDetails } from "../types/types";
import { rootLog } from "../logger";
import { extractYearFromReleaseDate } from "./SteamService";
import { PlayniteGameLink } from "../types/playnite";

const log = rootLog.child("steamWishlistStore");

// Ensure the directory exists
async function ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
}

// Get the full path for an account's snapshot file
function snapshotPath(email: string): string {
    return join(STEAM_WISHLIST_ROOT, `${email}${WISHLIST_SUFFIX}`);
}

/**
 * Parses Steam wishlist item details from the given JSON data.
 */
export async function parseWishlistResult(json: any, appid: number): Promise<SteamAppDetails | null> {
    if (!json || !appid) return null;

    const key = String(appid);
    const entry = json[key];

    if (!entry?.success || !entry.data) {
        log.warn(`Wishlist item ${appid} missing or unsuccessful`, {
            appid,
            entry: entry ? { success: entry.success } : null,
        });
        return null;
    }

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
    const links: PlayniteGameLink[] = [];
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

    let details: SteamAppDetails = {
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

    return details;
}

/**
 * Read snapshot file for an account, or null if none.
 */
export async function getSteamWishlistSnapshot(
    email: string,
): Promise<SteamWishlistSnapshot | null> {
    const file = snapshotPath(email);
    try {
        const raw = await fs.readFile(file, "utf8");
        return JSON.parse(raw) as SteamWishlistSnapshot;
    } catch {
        return null;
    }
}

/**
 * Overwrite snapshot file for an account.
 */
export async function saveSteamWishlistSnapshot(
    email: string,
    snapshot: SteamWishlistSnapshot,
): Promise<void> {
    await ensureDir(STEAM_WISHLIST_ROOT);
    await fs.writeFile(
        snapshotPath(email),
        JSON.stringify(snapshot, null, 2),
        "utf8",
    );
}

/**
 * Append a wishlist entry to the snapshot file for an account.
 * Keeps existing syncInProgress flag as-is.
 */
export async function appendSteamWishlistItemToFile(
    email: string,
    entry: SteamWishlistEntry,
): Promise<void> {
    const existing = await getSteamWishlistSnapshot(email);

    const now = new Date().toISOString();
    const snapshot: SteamWishlistSnapshot = {
        lastSynced: existing?.lastSynced ?? now,
        items: Array.isArray(existing?.items)
            ? [...existing!.items, entry]
            : [entry],
        // IMPORTANT: keep whatever syncInProgress was
        syncInProgress: existing?.syncInProgress,
    };

    await saveSteamWishlistSnapshot(email, snapshot);
}

/**
 * Resets syncInProgress to false for all wishlist snapshot files.
 * (Useful on startup after crashes.)
 */
export async function resetAllSteamWishlistSyncFlags(): Promise<void> {
    try {
        await ensureDir(STEAM_WISHLIST_ROOT);
        const files = await fs.readdir(STEAM_WISHLIST_ROOT);

        for (const file of files) {
            if (!file.endsWith(WISHLIST_SUFFIX)) continue;

            const fullPath = join(STEAM_WISHLIST_ROOT, file);

            try {
                const raw = await fs.readFile(fullPath, "utf8");
                const snapshot = JSON.parse(raw) as SteamWishlistSnapshot | any;

                if (snapshot && snapshot.syncInProgress) {
                    snapshot.syncInProgress = false;
                    await fs.writeFile(
                        fullPath,
                        JSON.stringify(snapshot, null, 2),
                        "utf8",
                    );
                }
            } catch (e: any) {
                console.warn(
                    `Failed to reset syncInProgress for wishlist file ${file}:`,
                    String(e?.message ?? e),
                );
            }
        }
    } catch (e: any) {
        console.warn(
            "Failed to scan STEAM_WISHLIST_ROOT for wishlist files:",
            String(e?.message ?? e),
        );
    }
}
