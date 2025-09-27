import express from "express";
import { promises as fs } from "node:fs";
import { join, basename } from "node:path";
import multer from "multer";
import {
  INPUT_DIR, WORK_DIR, DATA_DIR,
  cleanDir, normalizeBackslashPaths, copyLibraryFilesWithProgress, findExportDir, copyDir, run
} from "../helpers";

const router = express.Router();
const syncUpload = multer({ dest: INPUT_DIR });

// --- module-scoped lock flag ---
let isSyncing = false;

/**
 * @openapi
 * /api/playnite/live/ping:
 *   get:
 *     summary: Ping the Playnite Live API
 *     tags: [Playnite Live]
 *     responses:
 *       200:
 *         description: Pong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: ok
 */
router.get("/ping", (_req, res) => {
  res.json({ message: "ok" });
});

/**
 * @openapi
 * /api/playnite/live/log:
 *   post:
 *     summary: Ingest log events from the Playnite Viewer Bridge extension
 *     tags: [Playnite Live]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/LogEvent'
 *               - type: array
 *                 items:
 *                   $ref: '#/components/schemas/LogEvent'
 *     responses:
 *       204:
 *         description: Accepted
 */
router.post("/log", async (req, res) => {
  const payload = req.body;
  const events = Array.isArray(payload) ? payload : [payload];

  const sanitized = events
    .filter(e => e && typeof e === "object")
    .map(e => ({
      ts: e.ts || new Date().toISOString(),
      level: String(e.level || "info").toLowerCase(),
      kind: String(e.kind || "event"),
      msg: String(e.msg || ""),
      data: typeof e.data === "object" ? e.data : undefined,
      err: e.err ? String(e.err) : undefined,
      ctx: typeof e.ctx === "object" ? e.ctx : undefined,
      src: "playnite-extension",
    }));

  if (!sanitized.length) return res.status(400).json({ ok: false, error: "invalid payload" });

  const day = new Date().toISOString().slice(0, 10);
  const logDir = join(DATA_DIR, "logs");
  const logFile = join(logDir, `${day}.jsonl`);
  await fs.mkdir(logDir, { recursive: true });
  const lines = sanitized.map(o => JSON.stringify(o)).join("\n") + "\n";
  await fs.appendFile(logFile, lines, "utf8");

  for (const ev of sanitized) {
    console.log(
      `[playnite/live/log] ${ev.level.toUpperCase()} ${ev.kind}: ${ev.msg}`,
      ev.err ? `\n  err: ${ev.err}` : "",
      ev.data ? `\n  data: ${JSON.stringify(ev.data).slice(0, 400)}` : ""
    );
  }

  res.sendStatus(204);
});

/**
 * @openapi
 * /api/playnite/live/push:
 *   post:
 *     summary: Push the current list of installed Playnite games (GUIDs).
 *     tags: [Playnite Live]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [installed]
 *             properties:
 *               installed:
 *                 type: array
 *                 description: Array of Playnite Game IDs that are currently installed.
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Write result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *       400:
 *         description: Invalid payload.
 *       500:
 *         description: Server error.
 */
router.post("/push", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !Array.isArray(payload.installed)) {
      return res.status(400).json({ ok: false, error: "Body must be { installed: string[] }" });
    }
    const uniq = Array.from(new Set(payload.installed.map((s: string) => String(s))));
    const out = { installed: uniq, updatedAt: new Date().toISOString(), source: "playnite-extension" };
    await fs.writeFile(join(DATA_DIR, "local.Installed.json"), JSON.stringify(out, null, 2), "utf8");
    return res.json({ ok: true, count: uniq.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/**
 * @openapi
 * /api/playnite/live/sync:
 *   post:
 *     summary: Sync SDK-exported JSON + media from the extension (single ZIP)
 *     tags: [Playnite Live]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: A ZIP containing /export/*.json and /libraryfiles/.
 *     responses:
 *       200:
 *         description: Sync applied.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 jsonFiles: { type: integer }
 *                 mediaFiles: { type: integer }
 *       400:
 *         description: No file or invalid layout.
 *       423:
 *         description: A sync is already in progress. Try again shortly.
 *       500:
 *         description: Server error while applying the sync.
 */
router.post("/sync", syncUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "no file" });

  if (isSyncing) {
    return res.status(423).json({ ok: false, error: "sync_in_progress" });
  }
  isSyncing = true;

  const zipPath = req.file.path;

  try {
    await cleanDir(WORK_DIR);
    // merge-only strategy
    await fs.mkdir(DATA_DIR, { recursive: true });

    console.log(`[playnite/live/sync] Validating ZIP ${basename(zipPath)}…`);
    await run("7z", ["t", zipPath]);

    console.log("[playnite/live/sync] Extracting ZIP…");
    await run("7z", ["x", "-y", `-o${WORK_DIR}`, zipPath, "-bsp1", "-bso1"]);

    console.log("[playnite/live/sync] Normalizing backslash paths…");
    await normalizeBackslashPaths(WORK_DIR);

    console.log("[playnite/live/sync] Locating /export/*.json…");
    const exportDir = await findExportDir(WORK_DIR);
    if (!exportDir) return res.status(400).json({ ok: false, error: "no /export/*.json found in ZIP" });

    console.log("[playnite/live/sync] Copying JSON export to /data…");
    await copyDir(exportDir, DATA_DIR); // overwrite/add only

    console.log("[playnite/live/sync] Copying media (libraryfiles)…");
    const { copiedFiles: mediaFiles } = await copyLibraryFilesWithProgress({
      libDir: join(exportDir, ".."),
      workRoot: WORK_DIR,
      dataRoot: DATA_DIR,
      log: (m: string) => console.log(`[playnite/live/sync] ${m}`),
      progress: () => { },
      concurrency: 8,
      tickMs: 500,
    });

    const names = await fs.readdir(DATA_DIR);
    const jsonFiles = names.filter((n) => n.toLowerCase().endsWith(".json")).length;

    return res.json({ ok: true, jsonFiles, mediaFiles });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    try { await fs.unlink(zipPath); } catch { }
    isSyncing = false;
  }
});

/**
 * @openapi
 * /api/playnite/live/index:
 *   get:
 *     summary: Get the current server-side file index
 *     description: >
 *       Returns a list of files currently present under the server's `/data` directory.
 *       If `/data` does not exist yet (first run), this returns `{ ok: true, files: [] }`.
 *     tags: [Playnite Live]
 *     responses:
 *       200:
 *         description: Index retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [ok, generatedAt, files]
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-09-27T12:34:56.789Z
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required: [rel, size, mtimeMs]
 *                     properties:
 *                       rel:
 *                         type: string
 *                         description: Relative path under `/data` (e.g., `"games.Game.json"` or `"libraryfiles/box/abcd.jpg"`).
 *                         example: games.Game.json
 *                       size:
 *                         type: integer
 *                         format: int64
 *                         example: 12345
 *                       mtimeMs:
 *                         type: integer
 *                         format: int64
 *                         description: Last modified time in milliseconds since Unix epoch (UTC).
 *                         example: 1695836400000
 *             examples:
 *               emptyIndex:
 *                 summary: First run (no /data yet)
 *                 value: { ok: true, generatedAt: "2025-09-27T12:34:56.789Z", files: [] }
 *               populatedIndex:
 *                 summary: With shaped JSON + media
 *                 value:
 *                   ok: true
 *                   generatedAt: "2025-09-27T12:34:56.789Z"
 *                   files:
 *                     - { rel: "games.Game.json", size: 204800, mtimeMs: 1695836400000 }
 *                     - { rel: "tags.Tag.json", size: 1024, mtimeMs: 1695836400000 }
 *                     - { rel: "sources.GameSource.json", size: 512, mtimeMs: 1695836400000 }
 *                     - { rel: "libraryfiles/box/abcd.jpg", size: 34567, mtimeMs: 1695836400000 }
 *       500:
 *         description: Server error.
 */
router.get("/index", async (_req, res) => {
  try {
    const files: Array<{ rel: string; size: number; mtimeMs: number }> = [];

    // If /data doesn't exist yet, return an empty index (first run)
    let dataExists = false;
    try {
      const st = await fs.stat(DATA_DIR);
      dataExists = st.isDirectory();
    } catch { /* not found */ }
    if (!dataExists) {
      return res.json({ ok: true, generatedAt: new Date().toISOString(), files });
    }

    // Top-level shaped JSON files in /data
    const tops = await fs.readdir(DATA_DIR, { withFileTypes: true });
    for (const e of tops) {
      if (e.isFile() && e.name.toLowerCase().endsWith(".json")) {
        const p = join(DATA_DIR, e.name);
        const st = await fs.stat(p);
        files.push({ rel: e.name, size: st.size, mtimeMs: st.mtimeMs });
      }
    }

    // Recursively include /data/libraryfiles/**
    async function walk(dir: string, relBase = "libraryfiles") {
      let entries: import("node:fs").Dirent[];
      try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const abs = join(dir, e.name);
        const rel = join(relBase, e.name).replace(/\\/g, "/");
        if (e.isDirectory()) await walk(abs, rel);
        else {
          const st = await fs.stat(abs);
          files.push({ rel, size: st.size, mtimeMs: st.mtimeMs });
        }
      }
    }
    await walk(join(DATA_DIR, "libraryfiles"));

    res.json({ ok: true, generatedAt: new Date().toISOString(), files });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
