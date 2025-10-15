import { promises as fs } from "node:fs";
import { join, basename } from "node:path";
import {
    INPUT_DIR, WORK_DIR, DATA_DIR,
    run, cleanDir, normalizeBackslashPaths,
    copyLibraryFilesWithProgress,
} from "../helpers";
import { rootLog } from "../logger";

const log = rootLog.child("backupService");

export class BackupService {

    /**
     * Moves the uploaded temp file to INPUT_DIR with a sanitized name.
     * Returns the sanitized filename.
     */
    async storeUploadedFile(tempPath: string, originalName: string): Promise<string> {
        const safe = originalName.replace(/[^A-Za-z0-9._ -]/g, "_");
        const dest = join(INPUT_DIR, safe);

        log.info(`Sanitized filename → "${safe}"`);
        log.info(`Moving file to ${dest}`);

        await fs.rename(tempPath, dest);

        log.info("File stored successfully");
        return safe;
    }

    /**
     * Processes the ZIP file: validates, extracts, normalizes paths,
     * finds the library directory, dumps the database to JSON, and copies media files.
     */
    async processZipStream(params: {
        filename: string;
        password?: string;
        send: (type: string, data: any) => void;
    }): Promise<void> {
        const { filename, password = "", send } = params;

        // Mirror selected logs to SSE "log" while keeping server logs structured
        const sseLog = (m: string) => {
            log.debug(m);
            send("log", m);
        };

        const progress = (
            phase: "unzip" | "copy",
            percent: number,
            extra?: Record<string, any>
        ) => send("progress", { phase, percent, ...(extra || {}) });

        const zipPath = join(INPUT_DIR, basename(filename));
        log.info(`zipPath resolved`, { zipPath });

        try {
            await fs.access(zipPath);
            log.info("ZIP exists, continuing");

            await cleanDir(WORK_DIR);
            log.info("WORK_DIR cleaned");

            // Validate ZIP
            sseLog("Validating ZIP with 7z…");
            log.debug("Running 7z test");
            await run("7z", ["t", zipPath], {
                onStdout: (ln) => {
                    const m = /(\d{1,3})%/.exec(ln);
                    if (m) progress("unzip", Number(m[1])); // reuse unzip bar for test
                },
                onStderr: (ln) => /error/i.test(ln) && sseLog(`7z: ${ln}`),
            });
            log.info("ZIP validation complete");

            // Extract ZIP
            sseLog("Extracting ZIP with 7z…");
            log.debug("Running 7z extract");
            await run("7z", ["x", "-y", `-o${WORK_DIR}`, zipPath, "-bsp1", "-bso1"], {
                onStdout: (ln) => {
                    const m = /(\d{1,3})%/.exec(ln);
                    if (m) progress("unzip", Number(m[1]));
                },
                onStderr: (ln) => /error/i.test(ln) && sseLog(`7z: ${ln}`),
            });
            log.info("Extraction complete");

            // Normalize paths
            sseLog("Normalizing backslash paths…");
            await normalizeBackslashPaths(WORK_DIR);
            log.info("Backslash normalization complete");

            // Locate library dir
            sseLog("Locating library dir…");
            const libDir = await this.findLibraryDir(WORK_DIR);
            if (!libDir) {
                log.warn("No library directory with *.db found");
                throw new Error("No library directory with *.db");
            }
            log.info("Library dir found", { libDir });

            // Prepare /data
            sseLog("Clearing /data…");
            await fs.mkdir(DATA_DIR, { recursive: true });
            log.info("DATA_DIR ensured");

            // Dump LiteDB → JSON
            sseLog("Dumping LiteDB to JSON…");
            const env = { ...process.env };
            if (password) env.LITEDB_PASSWORD = password;
            log.debug("Running PlayniteBackupImport");
            const { out, err } = await run("./PlayniteBackupImport", [libDir, DATA_DIR], { env });
            if (out?.trim()) out.trim().split(/\r?\n/).forEach((l) => sseLog(l));
            if (err?.trim()) err.trim().split(/\r?\n/).forEach((l) => sseLog(l));
            log.info("PlayniteBackupImport finished");

            // Copy media
            log.info("Starting media copy");
            await copyLibraryFilesWithProgress({
                libDir,
                workRoot: WORK_DIR,
                dataRoot: DATA_DIR,
                log: (m) => sseLog(m),
                progress: ({ percent, copiedBytes, totalBytes, deltaBytes }) =>
                    progress("copy", percent, { copiedBytes, totalBytes, deltaBytes }),
                concurrency: 8,
                tickMs: 500,
            });
            log.info("Media copy finished");

            send("done", "ok");
            log.info("Process finished successfully");
        } catch (e: any) {
            log.error("ERROR", { err: String(e?.message ?? e) });
            send("error", String(e?.message || e));
            throw e; // let router handle error + end()
        }
    }

    /**
     * Find the library directory within the given root.
     * @param root Root directory to search
     * @returns The path to the library directory, or null if not found
     */
    async findLibraryDir(root: string): Promise<string | null> {
        log.debug(`findLibraryDir start`, { root });
        const stack = [root];
        while (stack.length) {
            const dir = stack.pop()!;
            let entries: import("node:fs").Dirent[];
            try {
                entries = await fs.readdir(dir, { withFileTypes: true });
            } catch { continue; }

            const hasGamesDb = entries.some(e => e.isFile() && /^(games|game)\.db$/i.test(e.name));
            if (hasGamesDb) { log.info(`library dir detected`, { dir }); return dir; }

            const libEntry = entries.find(e => e.isDirectory() && e.name.toLowerCase() === "library");
            if (libEntry) {
                const lib = join(dir, libEntry.name);
                try {
                    const libEntries = await fs.readdir(lib);
                    if (libEntries.some(n => /^(games|game)\.db$/i.test(n))) { log.info(`library dir detected`, { dir: lib }); return lib; }
                } catch { /* ignore */ }
            }

            for (const e of entries) if (e.isDirectory()) stack.push(join(dir, e.name));
        }
        log.debug(`library dir not found`, { root });
        return null;
    }
}
