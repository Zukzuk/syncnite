import { promises as fs } from "node:fs";
import { join } from "node:path";
import { rootLog } from "../logger";
import { DATA_DIR } from "../constants";

const log = rootLog.child("syncService");

export class SyncService {
    
    /**
     * Pushes a snapshot object to the server.
     * @param snapshot - snapshot object
     * @param email - user's email
     */
    async pushSnapshot(snapshot: unknown, email: string): Promise<void> {
        if (!snapshot || typeof snapshot !== "object") {
            log.warn("Invalid snapshot payload, expected snapshot object");
            throw new Error("Body must be a snapshot object");
        }
        if (!email) {
            throw new Error("missing email");
        }

        const safeEmail = email.trim().toLowerCase().replace(/[\\/:*?"<>|]/g, "_") || "unknown";
        const now = new Date().toISOString();
        const s: any = snapshot;

        // Normalise updatedAt (extension may send UpdatedAt or updatedAt)
        const updatedAt: string =
            typeof s?.updatedAt === "string"
                ? s.updatedAt
                : typeof s?.UpdatedAt === "string"
                    ? s.UpdatedAt
                    : now;

        const outDir = join(DATA_DIR, "snapshot");
        await fs.mkdir(outDir, { recursive: true });
        const outPath = join(outDir, "snapshot.json");

        const out = {
            ...s,
            updatedAt, // always provide a lowercase key for the web UI
            source: s?.source ?? "playnite-extension",
            pushedBy: safeEmail,
            serverUpdatedAt: now,
        };

        log.info("Writing snapshot.json", { outPath, updatedAt });
        await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");
    }

    /**
     * Pushes installed game IDs to the server.
     * @param installed - array of installed game IDs
     * @param email - user's email
     * @returns number of successfully pushed IDs 
     */
    async pushInstalled(installed: unknown, email: string): Promise<number> {
        if (!Array.isArray(installed)) {
            log.warn("Invalid payload, expected { installed: string[] }");
            throw new Error("Body must be { installed: string[] }");
        }
        if (!email) {
            throw new Error("missing email");
        }

        log.info(`Received ${installed.length} installed entries`);

        // Normalize & dedupe
        const uniq = Array.from(new Set(installed.map((s: any) => String(s))));
        log.info(`Normalized and deduped → ${uniq.length} unique entries`);

        // Prepare output object
        const out = {
            installed: uniq,
            updatedAt: new Date().toISOString(),
            source: "playnite-extension",
        };

        // sanitize email for filename
        const safeEmail = email.trim().toLowerCase().replace(/[\\/:*?"<>|]/g, "_");
        const outDir = join(DATA_DIR, "installed");
        await fs.mkdir(outDir, { recursive: true });
        const outPath = join(outDir, `${safeEmail}.Installed.json`);

        // Write to disk
        log.debug(`Writing Installed list to ${outPath}`);
        await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");

        log.info(`Installed list written`, { outPath, count: uniq.length });
        return uniq.length;
    }
}
