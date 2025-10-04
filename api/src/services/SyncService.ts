import { existsSync, promises as fs } from "node:fs";
import { join, basename } from "node:path";
import {
    INPUT_DIR, WORK_DIR, DATA_DIR,
    cleanDir, normalizeBackslashPaths, copyLibraryFilesWithProgress, findExportDir, copyDir, run
} from "../helpers";

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

    ingestLogs(payload: any): number {
        const events = Array.isArray(payload) ? payload : [payload];

        const sanitized = events
            .filter((e) => e && typeof e === "object")
            .map((e) => ({
                ts: e.ts || new Date().toISOString(),
                level: String(e.level || "info").toLowerCase(),
                kind: String(e.kind || "event"),
                msg: String(e.msg || ""),
                data: typeof e.data === "object" ? e.data : undefined,
                err: e.err ? String(e.err) : undefined,
                ctx: typeof e.ctx === "object" ? e.ctx : undefined,
                src: "playnite-extension",
            }));

        if (!sanitized.length) return 0;

        for (const ev of sanitized) {
            // same message body, prefixed as service
            console.log(
                `[syncService] ${ev.level.toUpperCase()} ${ev.kind}: ${ev.msg}`,
                ev.err ? `\n  err: ${ev.err}` : "",
                ev.data ? `\n  data: ${JSON.stringify(ev.data).slice(0, 400)}` : ""
            );
        }

        return sanitized.length;
    }

    async pushInstalled(installed: unknown): Promise<number> {
        if (!Array.isArray(installed)) {
            console.warn("[syncService] Invalid payload, expected { installed: string[] }");
            throw new Error("Body must be { installed: string[] }");
        }

        console.log(`[syncService] Received ${installed.length} installed entries`);

        // Normalize & dedupe
        const uniq = Array.from(new Set(installed.map((s: any) => String(s))));
        console.log(`[syncService] Normalized and deduped → ${uniq.length} unique entries`);

        // Prepare output object
        const out = {
            installed: uniq,
            updatedAt: new Date().toISOString(),
            source: "playnite-extension",
        };
        const outPath = join(DATA_DIR, "local/local.Installed.json");

        // Ensure data dir
        await fs.mkdir(join(DATA_DIR, "local"), { recursive: true });

        // Write to disk
        console.log(`[syncService] Writing Installed list to ${outPath}`);
        await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");
        console.log("[syncService] Successfully wrote local.Installed.json");

        console.log(`[syncService] Push complete, ${uniq.length} unique games recorded`);
        return uniq.length;
    }

    async processUpload(input: SyncUploadInput): Promise<SyncUploadResult> {
        const { zipPath, originalName: origName, sizeBytes: size } = input;

        if (!existsSync(INPUT_DIR)) {
            await fs.mkdir(INPUT_DIR, { recursive: true });
            console.log(`[syncService] Created input dir at: ${INPUT_DIR}`);
        }

        console.log(`[syncService] Incoming upload "${origName}" (${size} bytes), temp="${zipPath}"`);

        let jsonFiles = 0;
        let mediaFiles = 0;
        let savedZipPath: string | null = null;

        try {
            await cleanDir(WORK_DIR);
            await fs.mkdir(DATA_DIR, { recursive: true });
            console.log("[syncService] Cleaned WORK_DIR and prepared DATA_DIR");

            console.log(`[syncService] Validating ZIP ${basename(zipPath)}…`);
            await run("7z", ["t", zipPath]);

            console.log("[syncService] Extracting ZIP…");
            await run("7z", ["x", "-y", `-o${WORK_DIR}`, zipPath, "-bsp1", "-bso1"]);

            console.log("[syncService] Normalizing backslash paths…");
            await normalizeBackslashPaths(WORK_DIR);

            console.log("[syncService] Locating /export/*.json…");
            const exportDir = await findExportDir(WORK_DIR);
            if (!exportDir) {
                console.warn("[syncService] No /export/*.json found in ZIP");
                const err = new Error("no /export/*.json found in ZIP");
                (err as any).statusCode = 400;
                throw err;
            }

            console.log("[syncService] Copying JSON export to /data…");
            await copyDir(exportDir, DATA_DIR);
            const names = await fs.readdir(DATA_DIR);
            jsonFiles = names.filter((n) => n.toLowerCase().endsWith(".json")).length;
            console.log(`[syncService] JSON copy done, ${jsonFiles} JSON file(s) in DATA_DIR`);

            console.log("[syncService] Copying media (libraryfiles)…");
            const mediaResult = await copyLibraryFilesWithProgress({
                libDir: join(exportDir, ".."),
                workRoot: WORK_DIR,
                dataRoot: DATA_DIR,
                log: (m: string) => console.log(`[syncService] ${m}`),
                progress: () => { },
                concurrency: 8,
                tickMs: 500,
            });
            mediaFiles = mediaResult?.copiedFiles ?? 0;
            console.log(`[syncService] Media copy done: ${mediaFiles} files`);

            // Copy client-exported manifest if present (we'll normalize it next)
            const mf = join(WORK_DIR, "export", "manifest.json");
            try {
                const s = await fs.readFile(mf, "utf8");
                await fs.writeFile(join(DATA_DIR, "manifest.json"), s, "utf8");
                console.log("[syncService] manifest.json copied");
            } catch {
                console.warn("[syncService] manifest.json not found or unreadable");
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
                    console.warn("[syncService] /data/manifest.json missing; creating a minimal one");
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
                console.log("[syncService] normalized /data/manifest.json");
            } catch (e) {
                console.warn("[syncService] could not normalize /data/manifest.json", e);
            }

            // --- Only now (success path) do we persist the uploaded ZIP ---
            // Use the original filename; if it exists, add -1, -2, ...
            const baseName = origName;
            const tryPath = (suffix: number) =>
                suffix === 0
                    ? join(INPUT_DIR, baseName)
                    : join(
                        INPUT_DIR,
                        baseName.replace(/(\.[^.]*)?$/, (m) => `-${suffix}${m || ""}`)
                    );

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
                    console.log(`[syncService] Saved uploaded ZIP → ${candidate}`);
                    break;
                }
            }
            if (!savedZipPath) {
                console.warn("[syncService] Could not determine a unique filename for saved ZIP");
            }

            console.log("[syncService] Upload & sync finished successfully");
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
                    console.log(`[syncService] Removed temp upload "${zipPath}"`);
                } catch {
                    console.warn(`[syncService] Could not remove temp upload "${zipPath}"`);
                }
            }
        }
    }

}
