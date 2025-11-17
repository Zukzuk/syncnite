import { EXT_DIR } from "../constants";
import { rootLog } from "../logger";

const log = rootLog.child("extensionService");
const APP_VERSION = process.env.APP_VERSION ?? "dev";

export class ExtensionService {
    private readonly extensionFile = `${EXT_DIR}/latest.pext`;

    /**
     * Gets the latest extension package file path and download name.
     * @return An object containing the file path and download name.
     */
    getLatest(): { filePath: string; downloadName: string } {
        // Milestone: resolve latest
        log.info("Resolving latest extension package", { version: APP_VERSION });

        const filePath = this.extensionFile;
        const downloadName = `syncnite-bridge-${APP_VERSION}.pext`;

        log.info("Resolved extension package", { filePath, downloadName });

        return { filePath, downloadName };
    }
}
