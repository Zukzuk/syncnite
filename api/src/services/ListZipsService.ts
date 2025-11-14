import { promises as fs } from "node:fs";
import { join } from "node:path";
import { rootLog } from "../logger";

const log = rootLog.child("listZipsService");

export interface ZipFile {
    name: string;
    size: number;
    mtime: number;
}

export class ListZipsService {
    constructor(private readonly uploadsDir: string) { }

    /**
     * Lists .zip files with size + mtime, sorted by mtime desc. 
     * @returns list of .zip files in UPLOADS_DIR, sorted by mtime descending
     */
    async get(): Promise<ZipFile[]> {
        log.info(`Scanning UPLOADS_DIR for .zip files…`, { uploadsDir: this.uploadsDir });

        const files = await fs.readdir(this.uploadsDir, { withFileTypes: true });
        log.info(`Found ${files.length} entries in UPLOADS_DIR`);

        const zips: ZipFile[] = [];

        for (const f of files) {
            if (f.isFile() && /\.zip$/i.test(f.name)) {
                try {
                    const st = await fs.stat(join(this.uploadsDir, f.name));
                    zips.push({ name: f.name, size: st.size, mtime: st.mtimeMs });
                    log.debug(`ZIP file indexed`, { name: f.name, size: st.size, mtimeMs: st.mtimeMs });
                } catch (err: any) {
                    log.warn(`Could not stat file "${f.name}"`, { err: String(err?.message ?? err) });
                }
            }
        }

        zips.sort((a, b) => b.mtime - a.mtime);
        log.info(`Returning ${zips.length} zip file(s), sorted by mtime desc`);
        return zips;
    }
}
