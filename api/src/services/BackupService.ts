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
    async processZipStream(params: { filename: string; password?: string; }): Promise<void> {
        const { filename, password = "" } = params;

        const zipPath = join(INPUT_DIR, basename(filename));
        log.info(`zipPath resolved`, { zipPath });

        try {
            await fs.access(zipPath);
            log.info("ZIP exists, continuing");

            await cleanDir(WORK_DIR);
            log.info("WORK_DIR cleaned");

            // Validate ZIP
            log.info("Validating ZIP with 7z…");
            await run("7z", ["t", zipPath], {
                onStdout: (ln) => {
                    const m = /(\d{1,3})%/.exec(ln);
                    if (m) rootLog.logExternal({ level: "info", kind: "progress", data: { phase: "unzip", percent: Number(m[1]) } });
                },
                onStderr: (ln) => /error/i.test(ln) && log.warn(`7z: ${ln}`),
            });
            log.info("ZIP validation complete");

            // Extract ZIP
            log.info("Extracting ZIP with 7z…");
            await run("7z", ["x", "-y", `-o${WORK_DIR}`, zipPath, "-bsp1", "-bso1"], {
                onStdout: (ln) => {
                    const m = /(\d{1,3})%/.exec(ln);
                    if (m) rootLog.logExternal({ level: "info", kind: "progress", data: { phase: "unzip", percent: Number(m[1]) } });
                },
                onStderr: (ln) => /error/i.test(ln) && log.warn(`7z: ${ln}`),
            });

            log.info("Normalizing backslash paths…");
            await normalizeBackslashPaths(WORK_DIR);

            log.info("Locating library dir…");
            const libDir = await this.findLibraryDir(WORK_DIR);
            if (!libDir) throw new Error("No library directory with *.db");

            log.info("Clearing /data…");
            await fs.mkdir(DATA_DIR, { recursive: true });

            log.info("Dumping LiteDB to JSON…");
            const env = { ...process.env };
            if (password) (env as any).LITEDB_PASSWORD = password;
            const { out, err } = await run("./PlayniteBackupImport", [libDir, DATA_DIR], { env });
            if (out?.trim()) out.trim().split(/\r?\n/).forEach((l) => log.info(l));
            if (err?.trim()) err.trim().split(/\r?\n/).forEach((l) => log.warn(l));

            // Copy media with progress
            await copyLibraryFilesWithProgress({
                libDir,
                workRoot: WORK_DIR,
                dataRoot: DATA_DIR,
                log: (m) => log.info(m),
                progress: ({ percent, copiedBytes, totalBytes, deltaBytes }) =>
                    rootLog.logExternal({ level: "info", kind: "progress", data: { phase: "copy", percent, copiedBytes, totalBytes, deltaBytes } }),
            });

            log.info("Processing complete.");
        } catch (e: any) {
            log.error("ERROR", { err: String(e?.message ?? e) });
            throw e;
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
