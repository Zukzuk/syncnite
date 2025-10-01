import express from "express";
import multer from "multer";
import { SyncService } from "../services/SyncService";
import { INPUT_DIR } from "../helpers";

const router = express.Router();
const syncUpload = multer({ dest: INPUT_DIR });
const syncService = new SyncService();

let isSyncing = false;

/**
 * @openapi
 * tags:
 *   - name: Sync
 *     description: Endpoints for the Syncnite Bridge Playnite extension.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     PingResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: ok
 */
/**
 * @openapi
 * components:
 *   schemas:
 *     LogEvent:
 *       type: object
 *       description: A log/event record emitted by the Syncnite Bridge extension.
 *       properties:
 *         ts:
 *           type: string
 *           format: date-time
 *           description: Event timestamp; if missing, the server will set the current time.
 *           example: "2025-09-20T23:10:12.345Z"
 *         level:
 *           type: string
 *           description: Log level.
 *           enum: [trace, debug, info, warn, error, fatal]
 *           example: info
 *         kind:
 *           type: string
 *           description: Event classification/kind.
 *           example: event
 *         msg:
 *           type: string
 *           description: Human-readable message.
 *           example: Export completed
 *         data:
 *           type: object
 *           additionalProperties: true
 *           description: Structured data payload (optional).
 *           example: { "games": 120, "mediaCopied": true }
 *         err:
 *           type: string
 *           description: Optional error message/stack.
 *           example: "LiteDB password invalid"
 *         ctx:
 *           type: object
 *           additionalProperties: true
 *           description: Context fields (correlation ids, platform info, etc.).
 *           example: { "installId": "abcd-1234", "os": "Windows 11" }
 *         src:
 *           type: string
 *           readOnly: true
 *           description: Source identifier (server sets to "playnite-extension").
 *           example: "playnite-extension"
 */
/**
 * @openapi
 * components:
 *   schemas:
 *     PushInstalledRequest:
 *       type: object
 *       required: [installed]
 *       properties:
 *         installed:
 *           type: array
 *           description: Array of Playnite Game IDs that are currently installed.
 *           items:
 *             type: string
 *             format: uuid
 *       example:
 *         installed:
 *           - "b3e6b9c8-6e2f-4b15-9a3e-1c9f1ab81234"
 *           - "c7a2f02e-21f2-4d8f-b0e9-77b18c8a5678"
 *     OkCountResult:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         count:
 *           type: integer
 *           example: 2
 */
/**
 * @openapi
 * components:
 *   responses:
 *     Error423:
 *       description: A sync is already in progress. Try again shortly.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *   schemas:
 *     SyncUpResult:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         jsonFiles:
 *           type: integer
 *           description: Number of JSON files copied from /export.
 *           example: 7
 *         mediaFiles:
 *           type: integer
 *           description: Number of media files copied from /libraryfiles.
 *           example: 154
 *         upload:
 *           type: object
 *           nullable: true
 *           properties:
 *             savedZip:
 *               type: string
 *               nullable: true
 *               description: Final path of the stored ZIP (null if not persisted).
 *               example: "/input/2025-09-20-23-10.zip"
 *             originalName:
 *               type: string
 *               example: "2025-09-20-23-10.zip"
 *             sizeBytes:
 *               type: integer
 *               example: 12345678
 */
/**
 * @openapi
 * components:
 *   schemas:
 *     InstalledSummary:
 *       type: object
 *       properties:
 *         count:
 *           type: integer
 *           example: 120
 *         hash:
 *           type: string
 *           description: SHA-1 of the installed list.
 *           example: "9f2c5d8bb8e7f3c6b1a4a0f3b7c0e2d1f5a9c3e1"
 *     JsonFileStat:
 *       type: object
 *       properties:
 *         size:
 *           type: integer
 *           format: int64
 *           example: 204800
 *         mtimeMs:
 *           type: integer
 *           format: int64
 *           description: Last modified time in milliseconds since Unix epoch (UTC).
 *           example: 1695836400000
 *     GeneratedManifest:
 *       type: object
 *       properties:
 *         json:
 *           type: object
 *           additionalProperties:
 *             $ref: '#/components/schemas/JsonFileStat'
 *           description: Map of JSON filename → size/mtimeMs.
 *         mediaFolders:
 *           type: array
 *           items: { type: string }
 *           description: Subdirectories under `/data/libraryfiles`.
 *           example: ["box", "background", "logo"]
 *         installed:
 *           $ref: '#/components/schemas/InstalledSummary'
 *     ManifestResponse:
 *       type: object
 *       required: [ok, generatedAt, manifest]
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         generatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-09-27T12:34:56.789Z"
 *         manifest:
 *           oneOf:
 *             - $ref: '#/components/schemas/GeneratedManifest'
 *             - type: object
 *               additionalProperties: true
 *               description: Persisted manifest.json read from disk (arbitrary structure).
 */

/**
 * @openapi
 * /api/sync/ping:
 *   get:
 *     operationId: pingSync
 *     summary: Ping the Syncnite API
 *     tags: [Sync]
 *     responses:
 *       200:
 *         description: Pong response.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PingResponse'
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.get("/ping", (_req, res) => {
  res.json({ message: "ok" });
});

/**
 * @openapi
 * /api/sync/log:
 *   post:
 *     operationId: ingestLogs
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
 *           examples:
 *             single:
 *               summary: Single log event
 *               value:
 *                 ts: "2025-09-20T23:10:12.345Z"
 *                 level: "info"
 *                 kind: "event"
 *                 msg: "Export completed"
 *                 data: { "games": 120, "mediaCopied": true }
 *                 ctx: { "installId": "abcd-1234" }
 *             batch:
 *               summary: Batch of log events
 *               value:
 *                 - level: "debug"
 *                   kind: "progress"
 *                   msg: "Copying media"
 *                   data: { "percent": 42 }
 *                 - level: "error"
 *                   kind: "exception"
 *                   msg: "LiteDB error"
 *                   err: "LiteDB password invalid"
 *     responses:
 *       204:
 *         description: Accepted and processed. No content is returned.
 *       400:
 *         $ref: '#/components/responses/Error400'
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.post("/log", async (req, res) => {
  const count = syncService.ingestLogs(req.body);
  if (!count) return res.status(400).json({ ok: false, error: "invalid payload" });
  res.sendStatus(204);
});

/**
 * @openapi
 * /api/sync/push:
 *   post:
 *     operationId: pushInstalledGames
 *     summary: Push the current list of installed Playnite games
 *     tags: [Sync]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PushInstalledRequest'
 *           examples:
 *             sample:
 *               summary: Example payload
 *               value:
 *                 installed:
 *                   - "b3e6b9c8-6e2f-4b15-9a3e-1c9f1ab81234"
 *                   - "c7a2f02e-21f2-4d8f-b0e9-77b18c8a5678"
 *     responses:
 *       200:
 *         description: Write result.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OkCountResult'
 *       400:
 *         $ref: '#/components/responses/Error400'
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.post("/push", async (req, res) => {
  console.log("[sync/push] Incoming request…");

  try {
    console.log("[sync/push] Raw body received:", req.body);
    const count = await syncService.pushInstalled(req.body?.installed);
    return res.json({ ok: true, count });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/Body must be/.test(msg)) {
      console.warn("[sync/push] Invalid payload, expected { installed: string[] }");
      return res.status(400).json({ ok: false, error: "Body must be { installed: string[] }" });
    }
    console.error("[sync/push] ERROR:", msg);
    return res.status(500).json({ ok: false, error: msg });
  }
});

/**
 * @openapi
 * /api/sync/up:
 *   post:
 *     operationId: syncUpload
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
 *               $ref: '#/components/schemas/SyncUpResult'
 *             examples:
 *               success:
 *                 summary: Example success payload
 *                 value:
 *                   ok: true
 *                   jsonFiles: 7
 *                   mediaFiles: 154
 *                   upload:
 *                     savedZip: "/input/2025-09-20-23-10.zip"
 *                     originalName: "2025-09-20-23-10.zip"
 *                     sizeBytes: 12345678
 *       400:
 *         $ref: '#/components/responses/Error400'
 *       423:
 *         $ref: '#/components/responses/Error423'
 *       500:
 *         $ref: '#/components/responses/Error500'
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

  try {
    const result = await syncService.processUpload({
      zipPath: req.file.path,
      originalName: req.file.originalname,
      sizeBytes: req.file.size ?? 0,
    });

    return res.json({
      ok: true,
      jsonFiles: result.jsonFiles,
      mediaFiles: result.mediaFiles,
      upload: {
        savedZip: result.savedZipPath,
        originalName: result.originalName,
        sizeBytes: result.sizeBytes,
      },
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if ((e as any).statusCode === 400 || /no \/export\/\*\.json found in ZIP/i.test(msg)) {
      console.warn("[sync/up] No /export/*.json found in ZIP");
      return res.status(400).json({ ok: false, error: "no /export/*.json found in ZIP" });
    }
    console.error(`[sync/up] ERROR: ${msg}`);
    return res.status(500).json({ ok: false, error: msg });
  } finally {
    isSyncing = false;
    console.log("[sync/up] isSyncing reset to false");
  }
});

/**
 * @openapi
 * /api/sync/manifest:
 *   get:
 *     operationId: getServerManifest
 *     summary: Get the current server-side manifest
 *     description: >
 *       Returns either a persisted `manifest.json` from `/data/manifest.json`, or a generated manifest
 *       built by scanning `/data`. If `/data` does not exist yet, returns `{ ok: true, manifest: { json: {}, mediaFolders: [], installed: { count: 0, hash: "" } } }`.
 *     tags: [Sync]
 *     responses:
 *       200:
 *         description: Index retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManifestResponse'
 *             examples:
 *               persisted:
 *                 summary: Persisted manifest.json present
 *                 value:
 *                   ok: true
 *                   generatedAt: "2025-09-27T12:34:56.789Z"
 *                   manifest:
 *                     version: 1
 *                     files:
 *                       - rel: "games.Game.json"
 *                         size: 204800
 *                         mtimeMs: 1695836400000
 *               generated:
 *                 summary: Generated by scanning /data
 *                 value:
 *                   ok: true
 *                   generatedAt: "2025-09-27T12:34:56.789Z"
 *                   manifest:
 *                     json:
 *                       "games.Game.json": { "size": 204800, "mtimeMs": 1695836400000 }
 *                       "tags.Tag.json": { "size": 1024, "mtimeMs": 1695836400000 }
 *                     mediaFolders: ["box", "background", "logo"]
 *                     installed:
 *                       count: 120
 *                       hash: "9f2c5d8bb8e7f3c6b1a4a0f3b7c0e2d1f5a9c3e1"
 *               empty:
 *                 summary: First run (no /data yet)
 *                 value:
 *                   ok: true
 *                   generatedAt: "2025-09-27T12:34:56.789Z"
 *                   manifest:
 *                     json: {}
 *                     mediaFolders: []
 *                     installed: { count: 0, hash: "" }
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.get("/manifest", async (_req, res) => {
  console.log("[sync/manifest] Request received");

  try {
    const payload = await syncService.getManifest();
    return res.json(payload);
  } catch (e: any) {
    console.error("[sync/manifest] ERROR:", String(e?.message || e));
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
