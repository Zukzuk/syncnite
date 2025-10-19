import { promises as fs } from "node:fs";
import { join, basename } from "node:path";
import { runImportCore } from "../helpers";
import { rootLog } from "../logger";
import { INPUT_DIR } from "../constants";
import { SyncBus } from "./EventBusService";

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
     * Validates + extracts the ZIP into WORK_DIR, dumps JSON into WORK_DIR/json,
     * copies media into WORK_DIR/libraryfiles, merges into /data (overwrite, never delete).
     */
    async processZipStream(params: { filename: string; password?: string }): Promise<void> {
        const { filename, password = "" } = params;
        const zipPath = join(INPUT_DIR, basename(filename));
        log.info("zipPath resolved", { zipPath });

        try {
            await fs.access(zipPath); // ensure it exists
            await runImportCore(zipPath, password);
            log.info("Processing complete.");
            // optional: notify UI it's done
            try { SyncBus.publish({ type: "done", data: { ok: true } }); } catch { }
        } catch (e: any) {
            log.error("ERROR", { err: String(e?.message ?? e) });
            throw e;
        }
    }
}
