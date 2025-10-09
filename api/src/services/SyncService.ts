import { existsSync, promises as fs } from "node:fs";
import { join, basename } from "node:path";
import {
    INPUT_DIR, WORK_DIR, DATA_DIR,
    cleanDir, normalizeBackslashPaths, copyLibraryFilesWithProgress, findExportDir, copyDir, run
} from "../helpers";
import { rootLog } from "../logger";

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
     * Ingests log events from the Playnite extension.
     * @param payload - single event object or array of events
     * @returns number of ingested events
     */
    ingestLogs(payload: any): number {
        return rootLog.logExternal(payload);
    }

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
     * Processes an uploaded ZIP file from the Playnite extension.
     * Validates, extracts, copies JSON + media, normalizes manifest, saves the ZIP.
     * @param input - details about the uploaded ZIP file
     * @returns details about the processed upload
     */
    async processUpload(input: SyncUploadInput): Promise<SyncUploadResult> {
        const { zipPath, originalName: origName, sizeBytes: size } = input;

        if (!existsSync(INPUT_DIR)) {
            await fs.mkdir(INPUT_DIR, { recursive: true });
            log.debug(`Created input dir at: ${INPUT_DIR}`);
        }

        // Milestone: incoming upload
        log.info(`Incoming upload "${origName}" (${size} bytes), temp="${zipPath}"`);

        let jsonFiles = 0;
        let mediaFiles = 0;
        let savedZipPath: string | null = null;

        try {
            await cleanDir(WORK_DIR);
            await fs.mkdir(DATA_DIR, { recursive: true });
            log.info("Cleaned WORK_DIR and prepared DATA_DIR");

            log.debug(`Validating ZIP ${basename(zipPath)}…`);
            await run("7z", ["t", zipPath]);

            log.debug("Extracting ZIP…");
            await run("7z", ["x", "-y", `-o${WORK_DIR}`, zipPath, "-bsp1", "-bso1"]);

            log.debug("Normalizing backslash paths…");
            await normalizeBackslashPaths(WORK_DIR);

            log.debug("Locating /export/*.json…");
            const exportDir = await findExportDir(WORK_DIR);
            if (!exportDir) {
                log.warn("No /export/*.json found in ZIP");
                const err = new Error("no /export/*.json found in ZIP") as any;
                err.statusCode = 400;
                throw err;
            }

            // Milestone: copying JSON
            log.info("Copying JSON export to /data…");
            await copyDir(exportDir, DATA_DIR);
            const names = await fs.readdir(DATA_DIR);
            jsonFiles = names.filter((n) => n.toLowerCase().endsWith(".json")).length;
            log.info(`JSON copy done, ${jsonFiles} JSON file(s) in DATA_DIR`);

            // Milestone: copying media
            log.info("Copying media (libraryfiles)…");
            const mediaResult = await copyLibraryFilesWithProgress({
                libDir: join(exportDir, ".."),
                workRoot: WORK_DIR,
                dataRoot: DATA_DIR,
                log: (m: string) => log.debug(m),
                progress: () => { },
                concurrency: 8,
                tickMs: 500,
            });
            mediaFiles = mediaResult?.copiedFiles ?? 0;
            log.info(`Media copy done: ${mediaFiles} files`);

            // Copy client-exported manifest if present (we'll normalize it next)
            const mf = join(WORK_DIR, "export", "manifest.json");
            try {
                const s = await fs.readFile(mf, "utf8");
                await fs.writeFile(join(DATA_DIR, "manifest.json"), s, "utf8");
                log.debug("manifest.json copied");
            } catch {
                log.debug("manifest.json not found or unreadable");
            }

            // --- Normalize /data/manifest.json (authoritative from filesystem) ---
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
                    // ok if there is no media yet
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

            // --- Only now (success path) do we persist the uploaded ZIP ---
            // Use the original filename; if it exists, add -1, -2, ...
            const baseName = origName;
            const tryPath = (suffix: number) =>
                suffix === 0
                    ? join(INPUT_DIR, baseName)
                    : join(INPUT_DIR, baseName.replace(/(\.[^.]*)?$/, (m) => `-${suffix}${m || ""}`));

            let attempt = 0;
            while (attempt < 1000) {
                const candidate = tryPath(attempt);
                try {
                    await fs.access(candidate);
                    attempt += 1; // exists, try next
                } catch {
                    // doesn't exist → move (rename) the temp file here
                    await fs.rename(zipPath, candidate);
                    savedZipPath = candidate;
                    log.info(`Saved uploaded ZIP → ${candidate}`);
                    break;
                }
            }
            if (!savedZipPath) {
                log.warn("Could not determine a unique filename for saved ZIP");
            }

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
            // If we successfully moved the file (savedZipPath set), zipPath no longer exists.
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
