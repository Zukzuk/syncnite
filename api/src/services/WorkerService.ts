import { SteamWishlistEntry, SteamWishlistSnapshot } from "../types/steam";
import { rootLog } from "../logger";
import { getWishlistDetailsFromSteam, getWishlistFromSteam } from "./SteamService";
import {
    getSteamWishlistSnapshot,
    saveSteamWishlistSnapshot,
    appendSteamWishlistItemToFile,
} from "./SteamWishlistStore";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const log = rootLog.child("workerService");

/**
 * Fire and forget worker tasks
 */
export const WorkerService = {
    async steamWishlistUpdateCrawl(email: string, steamId: string, apiKey: string): Promise<void> {
        const now = new Date().toISOString();
        const existingSnapshot = await getSteamWishlistSnapshot(email);

        try {
            // 2. Fetch current Steam wishlist (core info only)
            const remoteWishlist = await getWishlistFromSteam(steamId, apiKey);

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
                detailedNew = await getWishlistDetailsFromSteam(
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
    }
}

