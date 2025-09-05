import express from "express";
import multer from "multer";
import { promises as fs } from "node:fs";
import { join, basename, dirname } from "node:path";
import {
    INPUT_DIR, WORK_DIR, DATA_DIR,
    run, cleanDir, normalizeBackslashPaths, findLibraryDir,
    copyLibraryFilesWithProgress,
} from "./helpers";

const router = express.Router();

// zips list
router.get("/zips", async (_req, res) => {
    const files = await fs.readdir(INPUT_DIR, { withFileTypes: true });
    const zips: Array<{ name: string; size: number; mtime: number }> = [];
    for (const f of files) {
        if (f.isFile() && /\.zip$/i.test(f.name)) {
            const st = await fs.stat(join(INPUT_DIR, f.name));
            zips.push({ name: f.name, size: st.size, mtime: st.mtimeMs });
        }
    }
    zips.sort((a, b) => b.mtime - a.mtime);
    res.json(zips);
});

// upload
const upload = multer({ dest: INPUT_DIR });
router.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: "no file" });
    const safe = req.file.originalname.replace(/[^A-Za-z0-9._ -]/g, "_");
    await fs.rename(req.file.path, join(INPUT_DIR, safe));
    res.json({ ok: true, file: safe });
});

// streaming process via SSE
router.get("/process-stream", async (req, res) => {
    const filename = String(req.query.filename ?? "");
    const password = String(req.query.password ?? "");

    if (!filename || !/\.zip$/i.test(filename)) {
        res.setHeader("Content-Type", "text/event-stream");
        return res.end("event: error\ndata: filename missing or not .zip\n\n");
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const send = (type: string, data: any) => {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        res.write(`event: ${type}\n`);
        res.write(`data: ${payload.replace ? payload.replace(/\n/g, "\\n") : payload}\n\n`);
    };
    const log = (m: string) => send("log", m);
    const progress = (phase: "unzip" | "copy", percent: number, extra?: Record<string, any>) =>
        send("progress", { phase, percent, ...(extra || {}) });

    const zipPath = join(INPUT_DIR, basename(filename));

    try {
        await fs.access(zipPath);
        await cleanDir(WORK_DIR);

        log("Validating ZIP with 7z…");
        await run("7z", ["t", zipPath], {
            onStdout: (ln) => {
                const m = /(\d{1,3})%/.exec(ln);
                if (m) progress("unzip", Number(m[1])); // reuse unzip bar for test
            },
            onStderr: (ln) => /error/i.test(ln) && log(`7z: ${ln}`),
        });

        log("Extracting ZIP with 7z…");
        await run("7z", ["x", "-y", `-o${WORK_DIR}`, zipPath, "-bsp1", "-bso1"], {
            onStdout: (ln) => {
                const m = /(\d{1,3})%/.exec(ln);
                if (m) progress("unzip", Number(m[1]));
            },
            onStderr: (ln) => /error/i.test(ln) && log(`7z: ${ln}`),
        });

        log("Normalizing backslash paths…");
        await normalizeBackslashPaths(WORK_DIR);

        log("Locating library dir…");
        const libDir = await findLibraryDir(WORK_DIR);
        if (!libDir) throw new Error("No library directory with *.db");

        log("Clearing /data…");
        await cleanDir(DATA_DIR);

        log("Dumping LiteDB to JSON…");
        const env = { ...process.env };
        if (password) env.LITEDB_PASSWORD = password;
        const { out, err } = await run("./PlayniteDump", [libDir, DATA_DIR], { env });
        if (out?.trim()) out.trim().split(/\r?\n/).forEach((l) => log(l));
        if (err?.trim()) err.trim().split(/\r?\n/).forEach((l) => log(l));

        await copyLibraryFilesWithProgress({
            libDir,
            workRoot: WORK_DIR,
            dataRoot: DATA_DIR,
            log,
            progress: ({ percent, copiedBytes, totalBytes, deltaBytes }) =>
                progress("copy", percent, { copiedBytes, totalBytes, deltaBytes }),
            concurrency: 8,
            tickMs: 500,
        });

        send("done", "ok");
        res.end();
    } catch (e: any) {
        send("error", String(e?.message || e));
        res.end();
    }
});

// (non-streaming /process kept if you still need it)
export default router;
