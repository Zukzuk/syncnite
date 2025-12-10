import { promises as fs } from "node:fs";
import { join } from "node:path";
import { STEAM_ROOT } from "../constants";
import { SteamWishlistSnapshot, SteamWishlistEntry } from "../types/types";

const SNAPSHOT_SUFFIX = ".steam.wishlist.json";

// Ensure the directory exists
async function ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
}

// Get the full path for an account's snapshot file
function snapshotPath(email: string): string {
    return join(STEAM_ROOT, `${email}${SNAPSHOT_SUFFIX}`);
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
    await ensureDir(STEAM_ROOT);
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
        await ensureDir(STEAM_ROOT);
        const files = await fs.readdir(STEAM_ROOT);

        for (const file of files) {
            if (!file.endsWith(SNAPSHOT_SUFFIX)) continue;

            const fullPath = join(STEAM_ROOT, file);

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
            "Failed to scan STEAM_ROOT for wishlist files:",
            String(e?.message ?? e),
        );
    }
}
