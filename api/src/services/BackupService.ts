import { promises as fs } from "node:fs";
import { join, basename } from "node:path";
import {
    INPUT_DIR, WORK_DIR, DATA_DIR,
    run, cleanDir, normalizeBackslashPaths, findLibraryDir,
    copyLibraryFilesWithProgress,
} from "../helpers";

export class BackupService {
    /**
     * Moves the uploaded temp file to INPUT_DIR with a sanitized name.
     * Returns the sanitized filename.
     */
    async storeUploadedFile(tempPath: string, originalName: string): Promise<string> {
        const safe = originalName.replace(/[^A-Za-z0-9._ -]/g, "_");
        const dest = join(INPUT_DIR, safe);

        console.log(`[backupService] Sanitized filename → "${safe}"`);
        console.log(`[backupService] Moving file to ${dest}`);

        await fs.rename(tempPath, dest);

        console.log("[backupService] File stored successfully");
        return safe;
    }

    /**
     * Processes an uploaded ZIP with progress + logs via SSE callbacks.
     * - send(type, payload): raw SSE send (already stringified in router)
     *   We’ll use send('log', string), send('progress', {...}), send('done'|'error', string)
     */
    async processZipStream(params: {
        filename: string;
        password?: string;
        send: (type: string, data: any) => void;
    }): Promise<void> {
        const { filename, password = "", send } = params;

        // Wrapper so all service-side logs are prefixed and mirrored to SSE "log"
        const sseLog = (m: string) => {
            console.log(`[backupService] ${m}`);
            send("log", m);
        };

        const progress = (
            phase: "unzip" | "copy",
            percent: number,
            extra?: Record<string, any>
        ) => send("progress", { phase, percent, ...(extra || {}) });

        const zipPath = join(INPUT_DIR, basename(filename));
        console.log(`[backupService] zipPath resolved to: ${zipPath}`);

        try {
            await fs.access(zipPath);
            console.log("[backupService] ZIP exists, continuing");

            await cleanDir(WORK_DIR);
            console.log("[backupService] WORK_DIR cleaned");

            sseLog("Validating ZIP with 7z…");
            console.log("[backupService] Running 7z test");
            await run("7z", ["t", zipPath], {
                onStdout: (ln) => {
                    const m = /(\d{1,3})%/.exec(ln);
                    if (m) progress("unzip", Number(m[1])); // reuse unzip bar for test
                },
                onStderr: (ln) => /error/i.test(ln) && sseLog(`7z: ${ln}`),
            });
            console.log("[backupService] ZIP validation complete");

            sseLog("Extracting ZIP with 7z…");
            console.log("[backupService] Running 7z extract");
            await run("7z", ["x", "-y", `-o${WORK_DIR}`, zipPath, "-bsp1", "-bso1"], {
                onStdout: (ln) => {
                    const m = /(\d{1,3})%/.exec(ln);
                    if (m) progress("unzip", Number(m[1]));
                },
                onStderr: (ln) => /error/i.test(ln) && sseLog(`7z: ${ln}`),
            });
            console.log("[backupService] Extraction complete");

            sseLog("Normalizing backslash paths…");
            await normalizeBackslashPaths(WORK_DIR);
            console.log("[backupService] Backslash normalization complete");

            sseLog("Locating library dir…");
            const libDir = await findLibraryDir(WORK_DIR);
            if (!libDir) {
                console.error("[backupService] No library directory with *.db found");
                throw new Error("No library directory with *.db");
            }
            console.log(`[backupService] Library dir found: ${libDir}`);

            sseLog("Clearing /data…");
            await fs.mkdir(DATA_DIR, { recursive: true });
            console.log("[backupService] DATA_DIR ensured");

            sseLog("Dumping LiteDB to JSON…");
            const env = { ...process.env };
            if (password) env.LITEDB_PASSWORD = password;
            console.log("[backupService] Running PlayniteBackupImport");
            const { out, err } = await run("./PlayniteBackupImport", [libDir, DATA_DIR], { env });
            if (out?.trim()) out.trim().split(/\r?\n/).forEach((l) => sseLog(l));
            if (err?.trim()) err.trim().split(/\r?\n/).forEach((l) => sseLog(l));
            console.log("[backupService] PlayniteBackupImport finished");

            console.log("[backupService] Starting media copy");
            await copyLibraryFilesWithProgress({
                libDir,
                workRoot: WORK_DIR,
                dataRoot: DATA_DIR,
                log: sseLog,
                progress: ({ percent, copiedBytes, totalBytes, deltaBytes }) =>
                    progress("copy", percent, { copiedBytes, totalBytes, deltaBytes }),
                concurrency: 8,
                tickMs: 500,
            });
            console.log("[backupService] Media copy finished");

            send("done", "ok");
            console.log("[backupService] Process finished successfully");
        } catch (e: any) {
            console.error("[backupService] ERROR:", String(e?.message || e));
            send("error", String(e?.message || e));
            throw e; // let router log its own error + end()
        }
    }
}
