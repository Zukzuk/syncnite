import { spawn, type SpawnOptionsWithoutStdio } from "node:child_process";
import { join, dirname } from "node:path";
import { promises as fs } from "node:fs";
import * as fsSync from "node:fs";
import { rootLog } from "./logger";
import { DATA_DIR, WORK_DIR } from "./constants";

const log = rootLog.child("helpers");

type RunOpts = SpawnOptionsWithoutStdio & {
    onStdout?: (line: string) => void;
    onStderr?: (line: string) => void;
};

// Runs a command with args, returns exit code, stdout, stderr.
function run(
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

// Recursively delete all contents of a directory
async function cleanDir(dir: string) {
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

// Recursively rename any files/dirs with backslashes in name to use forward slashes
async function normalizeBackslashPaths(root: string): Promise<void> {
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

// Copy library files from the extracted WORK_DIR to WORK_DIR/libraryfiles,
async function copyLibraryFilesWithProgress(opts: {
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

// Utility helpers for file operations
async function copyFileInto(target: string, source: string) {
    await ensureDir(dirname(target));
    await fs.copyFile(source, target);
}

// Recursively copy from src → dst, overwriting files, never deleting extras in dst.
async function mergeTreeOverwrite(src: string, dst: string) {
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const e of entries) {
        const s = join(src, e.name);
        const d = join(dst, e.name);
        if (e.isDirectory()) {
            await ensureDir(d);
            await mergeTreeOverwrite(s, d);
        } else if (e.isFile()) {
            await copyFileInto(d, s);
        }
    }
}

// utility helpers (put near your other helpers)
async function countJsonRec(root: string): Promise<number> {
    let total = 0;
    try {
        const stack = [root];
        while (stack.length) {
            const cur = stack.pop()!;
            const ents = await fs.readdir(cur, { withFileTypes: true });
            for (const e of ents) {
                const p = join(cur, e.name);
                if (e.isDirectory()) stack.push(p);
                else if (e.isFile() && e.name.toLowerCase().endsWith(".json")) total++;
            }
        }
    } catch { }
    return total;
}

async function pathExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

async function dirExists(p: string): Promise<boolean> {
  try { return (await fs.stat(p)).isDirectory(); } catch { return false; }
}

async function fileExists(p: string): Promise<boolean> {
  try { return (await fs.stat(p)).isFile(); } catch { return false; }
}

async function findRecentJsonDirs(root: string, sinceMs: number = Date.now() - 60_000): Promise<string[]> {
    const dirs = new Set<string>();
    const stack = [root];
    while (stack.length) {
        const cur = stack.pop()!;
        const ents = await fs.readdir(cur, { withFileTypes: true }).catch(() => []);
        for (const e of ents) {
            const p = join(cur, e.name);
            if (e.isDirectory()) {
                stack.push(p);
            } else if (e.isFile() && e.name.toLowerCase().endsWith(".json")) {
                try {
                    const st = await fs.stat(p);
                    // consider “recent” (last few minutes) to isolate this run’s dump
                    if (st.mtimeMs >= sinceMs) dirs.add(dirname(p));
                } catch { }
            }
        }
    }
    return Array.from(dirs);
}

export async function findLibraryDir(root: string): Promise<string | null> {
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
    return null;
}

export async function ensureDir(p: string) {
    await fs.mkdir(p, { recursive: true });
}

/**
 * Validates, extracts to WORK_DIR, finds lib dir, dumps DB to JSON (unless isSync),
 * copies media into WORK_DIR/libraryfiles, then merges both into DATA_DIR (overwrite-only).
 * NOTE: This does NOT clean DATA_DIR. It only cleans WORK_DIR.
 */
export async function runImportCore(zipPath: string, password = "", isSync = false): Promise<void> {
    await cleanDir(WORK_DIR);
    await ensureDir(WORK_DIR);

    await run("7z", ["t", zipPath]);
    await run("7z", ["x", "-y", `-o${WORK_DIR}`, zipPath, "-bsp1", "-bso1"]);

    await normalizeBackslashPaths(WORK_DIR);

    const TMP_JSON = join(WORK_DIR, "json");
    const TMP_MEDIA = join(WORK_DIR, "libraryfiles");
    await ensureDir(TMP_JSON);
    await ensureDir(TMP_MEDIA);

    // --- SYNC path: ready-made zip (skip DB dump entirely)
    if (isSync) {
        const libDir = join(WORK_DIR, "library");
        if (!(await dirExists(libDir))) {
            throw new Error("isSync=true but no /library directory found in zip");
        }

        // 1) Copy JSONs as-is
        await mergeTreeOverwrite(libDir, DATA_DIR);

        // 2) Copy media
        if (await dirExists(TMP_MEDIA)) {
            await mergeTreeOverwrite(TMP_MEDIA, join(DATA_DIR, "libraryfiles"));
        }

        // 3) Copy manifest (root-only)
        const mf = join(WORK_DIR, "manifest.json");
        if (await fileExists(mf)) {
            await fs.copyFile(mf, join(DATA_DIR, "manifest.json"));
            log.info("[import] manifest.json copied from zip root");
        } else {
            log.warn("[import] no manifest.json found at zip root");
        }

        return;
    }

    // --- BACKUP path: do normal DB → JSON dump
    const libDir = await findLibraryDir(WORK_DIR);
    if (!libDir) throw new Error("No library directory with *.db");

    const env = { ...process.env };
    if (password) (env as any).LITEDB_PASSWORD = password;

    const dumpStart = Date.now();
    const { out, err } = await run("./PlayniteImport", [libDir, TMP_JSON], { env });
    if (out?.trim()) out.trim().split(/\r?\n/).forEach((l) => log.info(l));
    if (err?.trim()) err.trim().split(/\r?\n/).forEach((l) => log.warn(l));

    const intendedCount = await countJsonRec(TMP_JSON);
    log.info(`[import] intended dump dir ${TMP_JSON} has ${intendedCount} JSON(s)`);

    let dumpOutDir = TMP_JSON;
    if (intendedCount === 0) {
        const candidates = await findRecentJsonDirs(WORK_DIR, dumpStart - 5_000);
        const scored = await Promise.all(candidates.map(async d => ({ d, n: await countJsonRec(d) })));
        scored.sort((a, b) => b.n - a.n);
        const pick = scored.find(s => s.n > 0);
        if (pick) {
            dumpOutDir = pick.d;
            log.warn(`[import] JSONs not in ${TMP_JSON}; using discovered dir: ${dumpOutDir} (${pick.n} files)`);
        } else {
            log.warn(`[import] No JSON files discovered under ${WORK_DIR} after dump.`);
        }
    } else {
        const ents = await fs.readdir(TMP_JSON).catch(() => []);
        log.info(`[import] sample JSON(s): ${ents.slice(0, 10).join(", ")}`);
    }

    // Copy media
    await copyLibraryFilesWithProgress({
        libDir,
        workRoot: WORK_DIR,
        dataRoot: WORK_DIR,
        log: (m) => log.info(m),
        progress: ({ percent, copiedBytes, totalBytes, deltaBytes }) =>
            rootLog.raw({ level: "info", kind: "progress", data: { phase: "copy", percent, copiedBytes, totalBytes, deltaBytes } }),
    });

    // Merge JSONs → /data
    await ensureDir(DATA_DIR);
    if (await countJsonRec(dumpOutDir) > 0) {
        await mergeTreeOverwrite(dumpOutDir, DATA_DIR);
    }

    // Merge media → /data/libraryfiles
    await mergeTreeOverwrite(TMP_MEDIA, join(DATA_DIR, "libraryfiles"));
}
