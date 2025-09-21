import { spawn, type SpawnOptionsWithoutStdio } from "node:child_process";
import { join, dirname } from "node:path";
import { promises as fs } from "node:fs";
import * as fsSync from "node:fs";
import { } from "node:child_process";

export type RunOpts = SpawnOptionsWithoutStdio & {
    onStdout?: (line: string) => void;
    onStderr?: (line: string) => void;
};
export const INPUT_DIR = "/input";
export const WORK_DIR = "/work";
export const DATA_DIR = "/data";

export function run(
    cmd: string,
    args: string[],
    opts: RunOpts = {}
): Promise<{ code: number | null; out: string; err: string }> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
        let out = "", err = "";

        const feed = (buf: Buffer, sink: "out" | "err", cb?: (line: string) => void) => {
            const s = buf.toString("utf8");
            if (cb) s.split(/\r?\n/).forEach((ln) => ln && cb(ln));
            if (sink === "out") out += s; else err += s;
        };

        child.stdout?.on("data", (b) => feed(b, "out", opts.onStdout));
        child.stderr?.on("data", (b) => feed(b, "err", opts.onStderr));
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, out, err }));
    });
}

export async function cleanDir(dir: string) {
    // Clear mount contents (works for tmpfs/bind mounts)
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        await Promise.all(entries.map((e) => fs.rm(join(dir, e.name), { recursive: true, force: true })));
    } catch (err: any) {
        if (err?.code === "ENOENT") {
            await fs.mkdir(dir, { recursive: true });
        } else {
            throw err;
        }
    }
}

export async function normalizeBackslashPaths(root: string): Promise<void> {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const e of entries) {
        const p = join(root, e.name);
        if (e.isDirectory()) {
            await normalizeBackslashPaths(p);
        } else if (e.isFile() && e.name.includes("\\")) {
            const parts = e.name.split("\\");
            const dest = join(root, ...parts);
            await fs.mkdir(dirname(dest), { recursive: true });
            await fs.rename(p, dest);
        }
    }
}

export async function findLibraryDir(root: string): Promise<string | null> {
    const stack = [root];
    while (stack.length) {
        const dir = stack.pop()!;
        let entries: import("node:fs").Dirent[];
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch { continue; }

        // direct hit: dir contains a games.db
        const hasGamesDb = entries.some(e => e.isFile() && /^(games|game)\.db$/i.test(e.name));
        if (hasGamesDb) return dir;

        // nested Playnite /library folder
        const libEntry = entries.find(e => e.isDirectory() && e.name.toLowerCase() === "library");
        if (libEntry) {
            const lib = join(dir, libEntry.name);
            try {
                const libEntries = await fs.readdir(lib);
                if (libEntries.some(n => /^(games|game)\.db$/i.test(n))) return lib;
            } catch { /* ignore */ }
        }

        // DFS
        for (const e of entries) if (e.isDirectory()) stack.push(join(dir, e.name));
    }
    return null;
}

/** Copy library media (usually sibling to /library) with live byte-level progress. */
export async function copyLibraryFilesWithProgress(opts: {
    libDir: string;          // e.g. /work/PlayniteBackup/library
    workRoot: string;        // e.g. /work
    dataRoot: string;        // e.g. /data
    log: (m: string) => void;
    progress?: (p: { phase: "copy"; percent: number; copiedBytes: number; totalBytes: number; deltaBytes: number }) => void;
    concurrency?: number;
    tickMs?: number;
}) {
    const { libDir, workRoot, dataRoot, log, progress, concurrency = 8, tickMs = 500 } = opts;

    // Prefer sibling of libDir: ../libraryfiles
    const sib = join(dirname(libDir), "libraryfiles");

    // Resolve source folder: sibling first, else try common tops within extraction
    const candidates: string[] = [sib];
    // common layouts: /work/PlayniteBackup/libraryfiles, /work/libraryfiles
    const entries = await fs.readdir(workRoot, { withFileTypes: true });
    for (const e of entries) {
        if (e.isDirectory()) {
            candidates.push(join(workRoot, e.name, "libraryfiles"));
        }
    }
    candidates.push(join(workRoot, "libraryfiles"));

    const isDir = async (p: string) => { try { return (await fs.stat(p)).isDirectory(); } catch { return false; } };

    let src: string | null = null;
    for (const c of candidates) {
        if (await isDir(c)) { src = c; break; }
    }
    if (!src) { log("No libraryfiles folder found."); return; }

    const destRoot = join(dataRoot, "libraryfiles");
    await fs.mkdir(destRoot, { recursive: true });

    // Index files and total size
    type Item = { src: string; rel: string; size: number };
    const items: Item[] = [];
    let totalBytes = 0;

    async function indexDir(dir: string, rel = ""): Promise<void> {
        const ents = await fs.readdir(dir, { withFileTypes: true });
        for (const e of ents) {
            const abs = join(dir, e.name);
            const r = join(rel, e.name);
            if (e.isDirectory()) await indexDir(abs, r);
            else {
                const st = await fs.stat(abs);
                items.push({ src: abs, rel: r, size: st.size });
                totalBytes += st.size;
            }
        }
    }
    await indexDir(src);

    if (!items.length) { log("No media files to copy."); return; }

    log(`Copying media from ${src} → ${destRoot}`);

    let copiedBytes = 0, copiedFiles = 0, failures = 0, lastReport = 0;
    const timer = setInterval(() => {
        const pct = totalBytes ? (copiedBytes / totalBytes) * 100 : 100;
        const delta = copiedBytes - lastReport; lastReport = copiedBytes;
        progress?.({ phase: "copy", percent: pct, copiedBytes, totalBytes, deltaBytes: delta });
    }, tickMs);

    const ensureDir = (p: string) => fs.mkdir(p, { recursive: true });

    let idx = 0;
    async function worker() {
        while (true) {
            const i = idx++; if (i >= items.length) break;
            const it = items[i];
            const dst = join(destRoot, it.rel);
            try {
                await ensureDir(dirname(dst));
                await new Promise<void>((resolve, reject) => {
                    const rs = fsSync.createReadStream(it.src);
                    const ws = fsSync.createWriteStream(dst);

                    rs.on("data", (chunk: Buffer | string) => {
                        copiedBytes += typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
                    });
                    rs.on("error", reject);
                    ws.on("error", reject);
                    ws.on("finish", () => resolve());

                    rs.pipe(ws);
                });
                copiedFiles++;
            } catch (e: any) {
                failures++; log(`ERROR copying ${it.rel}: ${e?.message ?? e}`);
            }
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
    clearInterval(timer);

    // final progress
    const pct = totalBytes ? (copiedBytes / totalBytes) * 100 : 100;
    progress?.({ phase: "copy", percent: pct, copiedBytes, totalBytes, deltaBytes: 0 });
    log(`Copy complete: ${copiedFiles} files, ${pct.toFixed(1)}%, ${failures} errors`);
}
