import express from "express";
import multer from "multer";
import { promises as fs } from "node:fs";
import { join, basename, dirname } from "node:path";
import {
    INPUT_DIR, WORK_DIR, DATA_DIR,
    run, cleanDir, normalizeBackslashPaths, findLibraryDir,
    copyLibraryFilesWithProgress,
} from "../helpers";

const router = express.Router();

/**
 * @openapi
 * /api/playnite/zips:
 *   get:
 *     summary: List uploaded ZIP files available for import
 *     tags: [Playnite Backup]
 *     responses:
 *       200:
 *         description: A list of ZIP files with basic metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: File name of the uploaded ZIP.
 *                     example: "2025-09-20-23-10.zip"
 *                   size:
 *                     type: integer
 *                     format: int64
 *                     description: File size in bytes.
 *                     example: 12345678
 *                   mtime:
 *                     type: number
 *                     format: double
 *                     description: Last modified time in milliseconds since Unix epoch.
 *                     example: 1695238745123
 *       500:
 *         description: Server error while reading the upload directory.
 */
router.get("/zips", async (_req, res) => {
    try {
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
    } catch (e: any) {
        res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
});

/**
 * @openapi
 * /api/playnite/backup/upload:
 *   post:
 *     summary: Upload a ZIP file containing a Playnite library
 *     tags: [Playnite Backup]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: ZIP file produced from a Playnite backup or exported folder.
 *     responses:
 *       200:
 *         description: Upload result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 file:
 *                   type: string
 *                   description: Sanitized file name stored on the server.
 *                   example: "2025-09-20-23-10.zip"
 *       400:
 *         description: No file was provided in the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "no file"
 *       413:
 *         description: The uploaded file is too large.
 *       500:
 *         description: Server error while saving the uploaded file.
 */
const upload = multer({ dest: INPUT_DIR });
router.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: "no file" });
    const safe = req.file.originalname.replace(/[^A-Za-z0-9._ -]/g, "_");
    await fs.rename(req.file.path, join(INPUT_DIR, safe));
    res.json({ ok: true, file: safe });
});

/**
 * @openapi
 * /api/playnite/backup/process-stream:
 *   get:
 *     summary: Stream the processing of an uploaded Playnite ZIP (unzip → dump LiteDB to JSON → copy media)
 *     description: |
 *       Server-Sent Events (SSE) endpoint that emits progress while processing a ZIP.
 *       Events emitted:
 *
 *       - `log`: free-form text messages
 *       - `progress`: JSON payload `{ phase: "unzip" | "copy", percent: number, ... }`
 *       - `done`: the string `"ok"` when finished
 *       - `error`: error message (string)
 *
 *       **Content-Type:** `text/event-stream`
 *     tags: [Playnite Backup]
 *     parameters:
 *       - in: query
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The ZIP file name previously returned by `/api/playnite/backup/upload`.
 *         example: "2025-09-20-23-10.zip"
 *       - in: query
 *         name: password
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional LiteDB password if the Playnite databases are encrypted.
 *     responses:
 *       200:
 *         description: Server-Sent Events stream with progress updates.
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *             example: text/event-stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *             examples:
 *               log:
 *                 summary: Log message event
 *                 value: |
 *                   event: log
 *                   data: Extracting ZIP with 7z…
 *
 *
 *               progress:
 *                 summary: Progress event example
 *                 value: |
 *                   event: progress
 *                   data: {"phase":"unzip","percent":42}
 *
 *
 *               done:
 *                 summary: Completion event
 *                 value: |
 *                   event: done
 *                   data: ok
 *
 *
 *               error:
 *                 summary: Error event
 *                 value: |
 *                   event: error
 *                   data: filename missing or not .zip
 *       400:
 *         description: Missing or invalid query parameters (e.g., filename not provided).
 *       404:
 *         description: The specified ZIP file could not be found on the server.
 *       500:
 *         description: Server error while processing the ZIP.
 */
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
        // merge-only strategy: ensure /data exists, do not wipe it
        await fs.mkdir(DATA_DIR, { recursive: true });

        log("Dumping LiteDB to JSON…");
        const env = { ...process.env };
        if (password) env.LITEDB_PASSWORD = password;
        const { out, err } = await run("./PlayniteBackupImport", [libDir, DATA_DIR], { env });
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

export default router;
