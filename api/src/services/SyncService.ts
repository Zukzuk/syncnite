import { existsSync, promises as fs } from "node:fs";
import { join } from "node:path";
import { runImportCore } from "../helpers";
import { rootLog } from "../logger";
import { DATA_DIR, INPUT_DIR, WORK_DIR } from "../constants";

const log = rootLog.child("syncService");

export interface SyncUploadInput {
    zipPath: string;       // temp path from multer
    originalName: string;  // original filename from client
    sizeBytes: number;
}

export interface SyncUploadResult {
    jsonFiles: number;
    mediaFiles: number;
    savedZipPath: string | null;
    originalName: string;
    sizeBytes: number;
}

export class SyncService {
    /**
     * Pushes installed game IDs to the server.
     * @param installed - array of installed game IDs
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

    /**
     * Processes an uploaded ZIP from the extension.
     * Additive: never clears /data. Uses WORK_DIR for extraction/staging, then merges into /data.
     * After merging, (re)builds /data/manifest.json and finally persists the uploaded zip in /input.
     */
    async processZipStream(input: SyncUploadInput): Promise<SyncUploadResult> {
        const { zipPath, originalName: origName, sizeBytes: size } = input;
        const password = "";
        const isSync = true;

        if (!existsSync(INPUT_DIR)) {
            await fs.mkdir(INPUT_DIR, { recursive: true });
            log.debug(`Created input dir at: ${INPUT_DIR}`);
        }

        log.info(`Incoming upload "${origName}" (${size} bytes), temp="${zipPath}"`);

        let jsonFiles = 0;
        let mediaFiles = 0;
        let savedZipPath: string | null = null;

        try {
            // --- Run the shared import core (WORK_DIR → DATA_DIR additive)
            await runImportCore(zipPath, password, isSync);

            // Quick counts from WORK_DIR (do not rely on shallow DATA_DIR listing)
            try {
                const tmpJson = join(WORK_DIR, "json");
                const list = await fs.readdir(tmpJson, { withFileTypes: true });
                jsonFiles = list.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json")).length;
            } catch { jsonFiles = 0; }

            try {
                const tmpMedia = join(WORK_DIR, "libraryfiles");
                const stack = [tmpMedia];
                let count = 0;
                while (stack.length) {
                    const d = stack.pop()!;
                    const ents = await fs.readdir(d, { withFileTypes: true });
                    for (const e of ents) {
                        const p = join(d, e.name);
                        if (e.isDirectory()) stack.push(p);
                        else if (e.isFile()) count++;
                    }
                }
                mediaFiles = count;
            } catch { mediaFiles = 0; }
            log.info(`This upload produced → JSON: ${jsonFiles}, Media files: ${mediaFiles}`);

            // --- Copy client-exported manifest if present (optional seed)
            const mf = join(WORK_DIR, "manifest.json");
            try {
                const s = await fs.readFile(mf, "utf8");
                await fs.writeFile(join(DATA_DIR, "manifest.json"), s, "utf8");
                log.debug("manifest.json copied from zipfile");
            } catch {
                log.debug("manifest.json not found in zipfile");
            }

            // --- Normalize /data/manifest.json (derive media folders/versions from /data)
            try {
                const manifestPath = join(DATA_DIR, "manifest.json");

                // Start from copied manifest if it exists
                let base: any = {};
                try {
                    const raw = await fs.readFile(manifestPath, "utf8");
                    base = JSON.parse(raw) || {};
                } catch {
                    base = {};
                    log.debug("/data/manifest.json missing; creating a minimal one");
                }

                // Scan /data/libraryfiles → derive mediaFolders + mediaVersions
                const lfRoot = join(DATA_DIR, "libraryfiles");
                let mediaFolders: string[] = [];
                const mediaVersions: Record<string, number> = {};

                try {
                    const ents = await fs.readdir(lfRoot, { withFileTypes: true });
                    mediaFolders = ents.filter(e => e.isDirectory()).map(e => e.name).sort();

                    for (const e of ents) {
                        if (!e.isDirectory()) continue;
                        const st = await fs.stat(join(lfRoot, e.name));
                        mediaVersions[e.name] = Math.floor(st.mtimeMs);
                    }
                } catch {
                    // ok if no media yet
                }

                // Final manifest (no 'installed' here)
                delete (base as any).installed;

                const finalManifest = {
                    updatedAt: new Date().toISOString(),
                    json: base.json ?? {},
                    mediaFolders,
                    mediaVersions,
                };

                await fs.writeFile(manifestPath, JSON.stringify(finalManifest, null, 2), "utf8");
                log.info("normalized /data/manifest.json");
            } catch (e) {
                log.warn("could not normalize /data/manifest.json", { err: String(e) });
            }

            // --- Persist the uploaded ZIP in /input (success path only)
            const tryPath = (suffix: number) =>
                suffix === 0
                    ? join(INPUT_DIR, origName)
                    : join(INPUT_DIR, origName.replace(/(\.[^.]*)?$/, (m) => `-${suffix}${m || ""}`));

            let attempt = 0;
            while (attempt < 1000) {
                const candidate = tryPath(attempt);
                try {
                    await fs.access(candidate);
                    attempt += 1; // exists → try next
                } catch {
                    await fs.rename(zipPath, candidate); // move temp → /input
                    savedZipPath = candidate;
                    log.info(`Saved uploaded ZIP → ${candidate}`);
                    break;
                }
            }
            if (!savedZipPath) log.warn("Could not determine a unique filename for saved ZIP");

            // Milestone: done
            log.info("Upload & sync finished successfully");
            return {
                jsonFiles,
                mediaFiles,
                savedZipPath,
                originalName: origName,
                sizeBytes: size,
            };
        } finally {
            // If we didn't move it successfully, clean tmp
            if (!savedZipPath) {
                try {
                    await fs.unlink(zipPath);
                    log.debug(`Removed temp upload "${zipPath}"`);
                } catch {
                    log.warn(`Could not remove temp upload "${zipPath}"`);
                }
            }
        }
    }
}
