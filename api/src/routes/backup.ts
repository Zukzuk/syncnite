import express from "express";
import multer from "multer";
import { promises as fs } from "node:fs";
import { join, basename } from "node:path";
import {
  INPUT_DIR, WORK_DIR, DATA_DIR,
  run, cleanDir, normalizeBackslashPaths, findLibraryDir,
  copyLibraryFilesWithProgress,
} from "../helpers";

const router = express.Router();
const upload = multer({ dest: INPUT_DIR });

/**
 * @openapi
 * tags:
 *   - name: Backup
 *     description: Upload and process Playnite library backups.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     UploadResult:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         file:
 *           type: string
 *           description: Sanitized file name stored on the server.
 *           example: "2025-09-20-23-10.zip"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Reason for failure"
 *     SseExample:
 *       type: string
 *       description: Server-Sent Events stream payload (newline-delimited).
 *       example: |-
 *         event: log
 *         data: Extracting ZIP with 7z…
 *
 *         event: progress
 *         data: {"phase":"unzip","percent":42}
 *
 *         event: done
 *         data: ok
 *   responses:
 *     Error400:
 *       description: Bad request.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Error404:
 *       description: Not found.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Error413:
 *       description: Payload too large.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Error500:
 *       description: Server error.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/backup/upload:
 *   post:
 *     operationId: uploadBackupZip
 *     summary: Upload a ZIP file containing a Playnite library
 *     tags: [Backup]
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
 *               $ref: '#/components/schemas/UploadResult'
 *       400:
 *         $ref: '#/components/responses/Error400'
 *       413:
 *         $ref: '#/components/responses/Error413'
 *       500:
 *         $ref: '#/components/responses/Error500'
 */

router.post("/upload", upload.single("file"), async (req, res) => {
  console.log("[backup/upload] Incoming request…");

  try {
    if (!req.file) {
      console.warn("[backup/upload] No file field provided");
      return res.status(400).json({ ok: false, error: "no file" });
    }

    const origName = req.file.originalname;
    const tmpPath = req.file.path;
    const size = req.file.size ?? 0;

    console.log(`[backup/upload] Received file: "${origName}", size=${size} bytes, temp="${tmpPath}"`);

    const safe = origName.replace(/[^A-Za-z0-9._ -]/g, "_");
    const dest = join(INPUT_DIR, safe);

    console.log(`[backup/upload] Sanitized filename → "${safe}"`);
    console.log(`[backup/upload] Moving file to ${dest}`);

    await fs.rename(tmpPath, dest);

    console.log("[backup/upload] File stored successfully");
    return res.json({ ok: true, file: safe });
  } catch (e: any) {
    console.error("[backup/upload] ERROR:", String(e?.message || e));
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/**
 * @openapi
 * /api/backup/process-stream:
 *   get:
 *     operationId: processBackupZipStream
 *     summary: Stream the processing of an uploaded Playnite ZIP (unzip → dump LiteDB to JSON → copy media)
 *     description: |
 *       Server-Sent Events (SSE) endpoint that emits progress while processing a ZIP.
 *
 *       Events emitted:
 *
 *       - `log`: free-form text messages
 *       - `progress`: JSON payload `{ "phase": "unzip" | "copy", "percent": number, ... }`
 *       - `done`: the string `"ok"` when finished
 *       - `error`: error message (string)
 *
 *       **Content-Type:** `text/event-stream`
 *     tags: [Backup]
 *     parameters:
 *       - in: query
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The ZIP file name previously returned by `/api/backup/upload`.
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
 *               $ref: '#/components/schemas/SseExample'
 *       400:
 *         $ref: '#/components/responses/Error400'
 *       404:
 *         $ref: '#/components/responses/Error404'
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.get("/process-stream", async (req, res) => {
  const filename = String(req.query.filename ?? "");
  const password = String(req.query.password ?? "");

  console.log("[backup/process-stream] Request received", { filename, password: password ? "***" : "(none)" });

  if (!filename || !/\.zip$/i.test(filename)) {
    console.warn("[backup/process-stream] Invalid or missing filename");
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
  const log = (m: string) => {
    console.log(`[backup/process-stream] ${m}`);
    send("log", m);
  };
  const progress = (
    phase: "unzip" | "copy",
    percent: number,
    extra?: Record<string, any>
  ) => {
    send("progress", { phase, percent, ...(extra || {}) });
  };

  const zipPath = join(INPUT_DIR, basename(filename));
  console.log(`[backup/process-stream] zipPath resolved to: ${zipPath}`);

  try {
    await fs.access(zipPath);
    console.log("[backup/process-stream] ZIP exists, continuing");

    await cleanDir(WORK_DIR);
    console.log("[backup/process-stream] WORK_DIR cleaned");

    log("Validating ZIP with 7z…");
    console.log("[backup/process-stream] Running 7z test");
    await run("7z", ["t", zipPath], {
      onStdout: (ln) => {
        const m = /(\d{1,3})%/.exec(ln);
        if (m) progress("unzip", Number(m[1])); // reuse unzip bar for test
      },
      onStderr: (ln) => /error/i.test(ln) && log(`7z: ${ln}`),
    });
    console.log("[backup/process-stream] ZIP validation complete");

    log("Extracting ZIP with 7z…");
    console.log("[backup/process-stream] Running 7z extract");
    await run("7z", ["x", "-y", `-o${WORK_DIR}`, zipPath, "-bsp1", "-bso1"], {
      onStdout: (ln) => {
        const m = /(\d{1,3})%/.exec(ln);
        if (m) progress("unzip", Number(m[1]));
      },
      onStderr: (ln) => /error/i.test(ln) && log(`7z: ${ln}`),
    });
    console.log("[backup/process-stream] Extraction complete");

    log("Normalizing backslash paths…");
    await normalizeBackslashPaths(WORK_DIR);
    console.log("[backup/process-stream] Backslash normalization complete");

    log("Locating library dir…");
    const libDir = await findLibraryDir(WORK_DIR);
    if (!libDir) {
      console.error("[backup/process-stream] No library directory with *.db found");
      throw new Error("No library directory with *.db");
    }
    console.log(`[backup/process-stream] Library dir found: ${libDir}`);

    log("Clearing /data…");
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log("[backup/process-stream] DATA_DIR ensured");

    log("Dumping LiteDB to JSON…");
    const env = { ...process.env };
    if (password) env.LITEDB_PASSWORD = password;
    console.log("[backup/process-stream] Running PlayniteBackupImport");
    const { out, err } = await run("./PlayniteBackupImport", [libDir, DATA_DIR], { env });
    if (out?.trim()) out.trim().split(/\r?\n/).forEach((l) => log(l));
    if (err?.trim()) err.trim().split(/\r?\n/).forEach((l) => log(l));
    console.log("[backup/process-stream] PlayniteBackupImport finished");

    console.log("[backup/process-stream] Starting media copy");
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
    console.log("[backup/process-stream] Media copy finished");

    send("done", "ok");
    console.log("[backup/process-stream] Process finished successfully");
    res.end();
  } catch (e: any) {
    console.error("[backup/process-stream] ERROR:", String(e?.message || e));
    send("error", String(e?.message || e));
    res.end();
  }
});

export default router;
