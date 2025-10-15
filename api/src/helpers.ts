import { spawn, type SpawnOptionsWithoutStdio } from "node:child_process";
import { join, dirname } from "node:path";
import { promises as fs } from "node:fs";
import * as fsSync from "node:fs";
import { rootLog } from "./logger";

const log = rootLog.child("helpers");

export const INPUT_DIR = "/input";
export const WORK_DIR = "/work";
export const DATA_DIR = "/data";

/**
 * Options for running a command.
 */
export type RunOpts = SpawnOptionsWithoutStdio & {
    onStdout?: (line: string) => void;
    onStderr?: (line: string) => void;
};

/**
 * Run a command and return its output.
 * @param cmd Command to run
 * @param args 
 * @param opts 
 * @returns 
 */
export function run(
    cmd: string,
    args: string[],
    opts: RunOpts = {}
): Promise<{ code: number | null; out: string; err: string }> {
    log.trace(`spawn exec`, { cmd, args });
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
        child.on("error", (e) => { log.warn(`spawn error`, { err: String((e as any)?.message ?? e) }); reject(e); });
        child.on("close", (code) => { log.trace(`spawn exit`, { code }); resolve({ code, out, err }); });
    });
}

/**
 * Clean a directory by removing all its contents. If the directory does not exist, it is created.
 * @param dir Directory to clean
 */
export async function cleanDir(dir: string) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        await Promise.all(entries.map((e) => fs.rm(join(dir, e.name), { recursive: true, force: true })));
    } catch (err: any) {
        if (err?.code === "ENOENT") {
            await fs.mkdir(dir, { recursive: true });
            log.debug(`created directory`, { dir });
        } else {
            throw err;
        }
    }
}

/**
 * Normalize backslash paths to forward slashes.
 * @param root Root directory to normalize
 * @returns
 */
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
            try { await fs.rename(p, dest); log.debug(`renamed entry`, { from: p, to: dest }); } catch { /* ignore racing*/ }
        }
    }
}

/**
 * Copy library media with live byte-level progress. Returns stats.
 * @param opts Options for copying library files
 * @returns Stats about the copy operation
 */
export async function copyLibraryFilesWithProgress(opts: {
    libDir: string;
    workRoot: string;
    dataRoot: string;
    log: (m: string) => void;
    progress?: (p: { phase: "copy"; percent: number; copiedBytes: number; totalBytes: number; deltaBytes: number }) => void;
    concurrency?: number;
    tickMs?: number;
}): Promise<{ copiedFiles: number; failures: number; totalBytes: number }> {
    const { libDir, workRoot, dataRoot, log: emit, progress, concurrency = 8, tickMs = 500 } = opts;

    // Prefer sibling of libDir: ../libraryfiles
    const sib = join(dirname(libDir), "libraryfiles");

    // Resolve source folder: sibling first, else try common tops within extraction
    const candidates: string[] = [sib];
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
    if (!src) { emit("No libraryfiles folder found."); return { copiedFiles: 0, failures: 0, totalBytes: 0 }; }

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

    if (!items.length) { emit("No media files to copy."); return { copiedFiles: 0, failures: 0, totalBytes }; }

    emit(`Copying media from ${src} → ${destRoot}`);

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
                failures++; emit(`ERROR copying ${it.rel}: ${e?.message ?? e}`);
            }
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
    clearInterval(timer);

    const pct = totalBytes ? (copiedBytes / totalBytes) * 100 : 100;
    progress?.({ phase: "copy", percent: pct, copiedBytes, totalBytes, deltaBytes: 0 });
    emit(`Copy complete: ${copiedFiles} files, ${pct.toFixed(1)}%, ${failures} errors`);

    return { copiedFiles, failures, totalBytes };
}