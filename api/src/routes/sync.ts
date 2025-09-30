
import express from "express";
import { existsSync, promises as fs } from "node:fs";
import { join, basename } from "node:path";
import multer from "multer";
import {
  INPUT_DIR, WORK_DIR, DATA_DIR,
  cleanDir, normalizeBackslashPaths, copyLibraryFilesWithProgress, findExportDir, copyDir, run
} from "../helpers";

const router = express.Router();
const syncUpload = multer({ dest: INPUT_DIR });
let isSyncing = false;

/**
 * @openapi
 * /api/sync/ping:
 *   get:
 *     summary: Ping the Syncnite API
 *     tags: [Sync]
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
 * /api/sync/log:
 *   post:
 *     summary: Ingest log events from the Syncnite Bridge extension
 *     tags: [Sync]
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
      `[sync/log] ${ev.level.toUpperCase()} ${ev.kind}: ${ev.msg}`,
      ev.err ? `\n  err: ${ev.err}` : "",
      ev.data ? `\n  data: ${JSON.stringify(ev.data).slice(0, 400)}` : ""
    );
  }

  res.sendStatus(204);
});

/**
 * @openapi
 * /api/sync/push:
 *   post:
 *     summary: Push the current list of installed Playnite games
 *     tags: [Sync]
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
  console.log("[sync/push] Incoming request…");

  try {
    const payload = req.body;
    console.log("[sync/push] Raw body received:", payload);

    if (!payload || !Array.isArray(payload.installed)) {
      console.warn("[sync/push] Invalid payload, expected { installed: string[] }");
      return res
        .status(400)
        .json({ ok: false, error: "Body must be { installed: string[] }" });
    }

    console.log(`[sync/push] Received ${payload.installed.length} installed entries`);

    // Normalize & dedupe
    const uniq = Array.from(new Set(payload.installed.map((s: string) => String(s))));
    console.log(`[sync/push] Normalized and deduped → ${uniq.length} unique entries`);

    // Prepare output object
    const out = {
      installed: uniq,
      updatedAt: new Date().toISOString(),
      source: "playnite-extension",
    };
    const outPath = join(DATA_DIR, "local.Installed.json");

    // Write to disk
    console.log(`[sync/push] Writing Installed list to ${outPath}`);
    await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");
    console.log("[sync/push] Successfully wrote local.Installed.json");

    console.log(`[sync/push] Push complete, ${uniq.length} unique games recorded`);
    return res.json({ ok: true, count: uniq.length });
  } catch (e: any) {
    console.error("[sync/push] ERROR:", String(e?.message || e));
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});


/**
 * @openapi
 * /api/sync/up:
 *   post:
 *     summary: Sync from the Syncnite Bridge extension
 *     tags: [Sync]
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
router.post("/up", syncUpload.single("file"), async (req, res) => {
  if (!req.file) {
    console.warn("[sync/up] Request rejected: no file uploaded");
    return res.status(400).json({ ok: false, error: "no file" });
  }

  if (isSyncing) {
    console.warn("[sync/up] Request rejected: sync already in progress");
    return res.status(423).json({ ok: false, error: "sync_in_progress" });
  }
  isSyncing = true;

  const zipPath = req.file.path;            // temp path from multer
  const origName = req.file.originalname;   // already appropriately named
  const size = req.file.size ?? 0;

  if (!existsSync(INPUT_DIR)) {
    await fs.mkdir(INPUT_DIR, { recursive: true });
    console.log(`[sync/up] Created input dir at: ${INPUT_DIR}`);
  }

  console.log(`[sync/up] Incoming upload "${origName}" (${size} bytes), temp="${zipPath}"`);

  let jsonFiles = 0;
  let mediaFiles = 0;
  let savedZipPath: string | null = null;

  try {
    await cleanDir(WORK_DIR);
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log("[sync/up] Cleaned WORK_DIR and prepared DATA_DIR");

    console.log(`[sync/up] Validating ZIP ${basename(zipPath)}…`);
    await run("7z", ["t", zipPath]);

    console.log("[sync/up] Extracting ZIP…");
    await run("7z", ["x", "-y", `-o${WORK_DIR}`, zipPath, "-bsp1", "-bso1"]);

    console.log("[sync/up] Normalizing backslash paths…");
    await normalizeBackslashPaths(WORK_DIR);

    console.log("[sync/up] Locating /export/*.json…");
    const exportDir = await findExportDir(WORK_DIR);
    if (!exportDir) {
      console.warn("[sync/up] No /export/*.json found in ZIP");
      return res.status(400).json({ ok: false, error: "no /export/*.json found in ZIP" });
    }

    console.log("[sync/up] Copying JSON export to /data…");
    await copyDir(exportDir, DATA_DIR);
    const names = await fs.readdir(DATA_DIR);
    jsonFiles = names.filter((n) => n.toLowerCase().endsWith(".json")).length;
    console.log(`[sync/up] JSON copy done, ${jsonFiles} JSON file(s) in DATA_DIR`);

    console.log("[sync/up] Copying media (libraryfiles)…");
    const mediaResult = await copyLibraryFilesWithProgress({
      libDir: join(exportDir, ".."),
      workRoot: WORK_DIR,
      dataRoot: DATA_DIR,
      log: (m: string) => console.log(`[sync/up] ${m}`),
      progress: () => {},
      concurrency: 8,
      tickMs: 500,
    });
    mediaFiles = mediaResult?.copiedFiles ?? 0;
    console.log(`[sync/up] Media copy done: ${mediaFiles} files`);

    const mf = join(WORK_DIR, "export", "manifest.json");
    try {
      const s = await fs.readFile(mf, "utf8");
      await fs.writeFile(join(DATA_DIR, "manifest.json"), s, "utf8");
      console.log("[sync/up] manifest.json copied");
    } catch {
      console.warn("[sync/up] manifest.json not found or unreadable");
    }

    // --- Only now (success path) do we persist the uploaded ZIP ---
    // Use the original filename; if it exists, add -1, -2, ...
    const baseName = origName;
    const tryPath = (suffix: number) =>
      suffix === 0
        ? join(INPUT_DIR, baseName)
        : join(
            INPUT_DIR,
            baseName.replace(/(\.[^.]*)?$/, (m) => `-${suffix}${m || ""}`)
          );

    let attempt = 0;
    while (attempt < 1000) {
      const candidate = tryPath(attempt);
      try {
        await fs.access(candidate);
        attempt += 1; // exists, try next
      } catch {
        // doesn't exist → move (rename) the temp file here
        await fs.rename(zipPath, candidate);
        savedZipPath = candidate;
        console.log(`[sync/up] Saved uploaded ZIP → ${candidate}`);
        break;
      }
    }
    if (!savedZipPath) {
      console.warn("[sync/up] Could not determine a unique filename for saved ZIP");
    }

    console.log("[sync/up] Upload & sync finished successfully");
    return res.json({
      ok: true,
      jsonFiles,
      mediaFiles,
      upload: {
        savedZip: savedZipPath,   // may be null if save name couldn’t be determined
        originalName: origName,
        sizeBytes: size,
      },
    });
  } catch (e: any) {
    console.error(`[sync/up] ERROR: ${String(e?.message || e)}`);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    // If we successfully moved the file (savedZipPath set), zipPath no longer exists.
    if (!savedZipPath) {
      try {
        await fs.unlink(zipPath);
        console.log(`[sync/up] Removed temp upload "${zipPath}"`);
      } catch {
        console.warn(`[sync/up] Could not remove temp upload "${zipPath}"`);
      }
    }
    isSyncing = false;
    console.log("[sync/up] isSyncing reset to false");
  }
});

/**
 * @openapi
 * /api/sync/manifest:
 *   get:
 *     summary: Get the current server-side manifest
 *     description: >
 *       Returns a list of files currently present under the server's `/data` directory.
 *       If `/data` does not exist yet (first run), this returns `{ ok: true, files: [] }`.
 *     tags: [Sync]
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
router.get("/manifest", async (_req, res) => {
  console.log("[sync/manifest] Request received");

  try {
    // Try persisted manifest first
    try {
      console.log("[sync/manifest] Checking for persisted manifest.json");
      const disk = await fs.readFile(join(DATA_DIR, "manifest.json"), "utf8");
      const obj = JSON.parse(disk);
      console.log("[sync/manifest] Found persisted manifest.json, returning it");
      return res.json({ ok: true, generatedAt: new Date().toISOString(), manifest: obj });
    } catch {
      console.warn("[sync/manifest] No persisted manifest.json found, falling back to scan");
    }

    // Fallback: build coarse manifest
    const out: any = { json: {}, mediaFolders: [], installed: { count: 0, hash: "" } };

    // JSON presence & mtimes/sizes
    let dataExists = false;
    try {
      const st = await fs.stat(DATA_DIR);
      dataExists = st.isDirectory();
      console.log("[sync/manifest] DATA_DIR exists, scanning…");
    } catch {
      console.warn("[sync/manifest] DATA_DIR not found, manifest will be empty");
    }

    if (dataExists) {
      const names = await fs.readdir(DATA_DIR);
      console.log(`[sync/manifest] Found ${names.length} entries in DATA_DIR`);

      for (const n of names) {
        if (!n.toLowerCase().endsWith(".json")) continue;
        const st = await fs.stat(join(DATA_DIR, n));
        out.json[n] = { size: st.size, mtimeMs: Math.floor(st.mtimeMs) };
        console.log(`[sync/manifest] JSON file: ${n}, size=${st.size}, mtimeMs=${Math.floor(st.mtimeMs)}`);
      }

      // Media folders inside /data/libraryfiles
      const lfRoot = join(DATA_DIR, "libraryfiles");
      try {
        const ents = await fs.readdir(lfRoot, { withFileTypes: true });
        out.mediaFolders = ents.filter(e => e.isDirectory()).map(e => e.name).sort();
        console.log(`[sync/manifest] Found ${out.mediaFolders.length} media folder(s) in libraryfiles`);
      } catch {
        console.warn("[sync/manifest] No libraryfiles folder yet");
      }

      // Installed list summary
      try {
        const raw = await fs.readFile(join(DATA_DIR, "local.Installed.json"), "utf8");
        const obj = JSON.parse(raw);
        const list = Array.isArray(obj?.installed) ? obj.installed : [];
        out.installed = {
          count: list.length,
          hash: require("node:crypto")
            .createHash("sha1")
            .update(JSON.stringify(list))
            .digest("hex"),
        };
        console.log(`[sync/manifest] Installed list found: ${list.length} entries, hash=${out.installed.hash}`);
      } catch {
        console.warn("[sync/manifest] No local.Installed.json found");
      }
    }

    console.log("[sync/manifest] Manifest generated, returning response");
    return res.json({ ok: true, generatedAt: new Date().toISOString(), manifest: out });
  } catch (e: any) {
    console.error("[sync/manifest] ERROR:", String(e?.message || e));
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});


export default router;
