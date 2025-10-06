import { rootLog } from "../logger";

const log = rootLog.child("extensionService");
const APP_VERSION = process.env.APP_VERSION ?? "dev";

export class ExtensionService {
    private readonly extensionFile = "/extension/latest.pext";

    /**
     * Resolves the latest packaged extension (.pext) for download.
     * @returns The file path and download name of the latest extension package.
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
