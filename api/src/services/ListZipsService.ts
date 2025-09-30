import { promises as fs } from "node:fs";
import { join } from "node:path";

export interface ZipFile {
    name: string;
    size: number;
    mtime: number;
}

export class ListZipsService {
    constructor(private readonly inputDir: string) { }

    /**
     * Lists .zip files with size + mtime, sorted by mtime desc.
     */
    async get(): Promise<ZipFile[]> {
        const files = await fs.readdir(this.inputDir, { withFileTypes: true });
        console.log(`[listZipsService] Found ${files.length} entries in INPUT_DIR`);

        const zips: ZipFile[] = [];

        for (const f of files) {
            if (f.isFile() && /\.zip$/i.test(f.name)) {
                try {
                    const st = await fs.stat(join(this.inputDir, f.name));
                    zips.push({ name: f.name, size: st.size, mtime: st.mtimeMs });
                    console.log(`[listZipsService] ZIP file: ${f.name}, size=${st.size}, mtime=${st.mtime}`);
                } catch (err: any) {
                    console.warn(
                        `[listZipsService] Could not stat file "${f.name}": ${String(err?.message || err)}`
                    );
                }
            }
        }

        zips.sort((a, b) => b.mtime - a.mtime);
        console.log(`[listZipsService] Returning ${zips.length} zip file(s), sorted by mtime desc`);
        return zips;
    }
}
