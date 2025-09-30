const APP_VERSION = process.env.APP_VERSION ?? "dev";

export class ExtensionService {
    private readonly extensionFile = "/extension/latest.pext";

    /**
     * Returns the file path and download filename for the extension.
     */
    getLatest(): { filePath: string; downloadName: string } {
        console.log(`[extensionService] Resolving latest extension package`);
        console.log(`[extensionService] File: ${this.extensionFile}, version: ${APP_VERSION}`);

        return {
            filePath: this.extensionFile,
            downloadName: `syncnite-bridge-${APP_VERSION}.pext`,
        };
    }
}
