import express from "express";
import multer from "multer";
import { SyncService } from "../services/SyncService";
import { INPUT_DIR } from "../helpers";
import { requireAdmin } from "../middleware/requireAdmin";
import { rootLog } from "../logger";
import { SyncBus } from "../services/EventBusService";
import { createSSE } from "../sse";

const router = express.Router();
router.use(requireAdmin);
const syncUpload = multer({ dest: INPUT_DIR });
const syncService = new SyncService();
const log = rootLog.child("route:sync");

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
 *         version:
 *           type: string
 *           example: v1.0.0
 */

/**
 * @openapi
 * /api/sync/ping:
 *   get:
 *     operationId: pingSync
 *     summary: Ping the Syncnite API
 *     tags: [Sync]
 *     security:
 *       - XAuthEmail: []
 *       - XAuthPassword: []
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
  const APP_VERSION = process.env.APP_VERSION ?? "dev";
  res.json({ message: "ok", version: `v${APP_VERSION}` });
});

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
 * /api/sync/log:
 *   post:
 *     operationId: ingestLogs
 *     summary: Ingest log events from the Syncnite Bridge extension
 *     tags: [Sync]
 *     security:
 *       - XAuthEmail: []
 *       - XAuthPassword: []
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

  // Fan-out to SSE subscribers + progress rewrite
  const rows = Array.isArray(req.body) ? req.body : [req.body];
  for (const r of rows) {
    const level = String(r?.level || "").toLowerCase();
    const kind = String(r?.kind || "event").toLowerCase();
    const msg = r?.line || r?.msg || "";

    const d = (r?.data || {}) as any;
    if (kind === "progress" || (d && typeof d.percent === "number")) {
      SyncBus.publish({ type: "progress", data: { phase: d?.phase ?? null, percent: d.percent } });
      if (msg) SyncBus.publish({ type: "log", data: String(msg) });
      continue;
    }

    // we keep all other events as log lines (incl. errors)
    const line = String(msg || `[${kind}]`);
    SyncBus.publish({ type: "log", data: line });
    if (level === "error") {
      // optional: echo a visible error line (UI shows it anyway via `log`)
    }
  }

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
 *     security:
 *       - XAuthEmail: []
 *       - XAuthPassword: []
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
  log.info("push: incoming request");

  try {
    log.info("push: raw body received:", req.body);
    const email = (req as any).authEmail
      || String(req.header("x-auth-email") || "").toLowerCase();
    const count = await syncService.pushInstalled(req.body?.installed, email);
    return res.json({ ok: true, count });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/Body must be/.test(msg)) {
      log.warn("push: invalid payload, expected { installed: string[] }");
      return res.status(400).json({ ok: false, error: "Body must be { installed: string[] }" });
    }
    log.error("push: failed:", msg);
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
 *     security:
 *       - XAuthEmail: []
 *       - XAuthPassword: []
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
  log.info("up: incoming request");

  if (!req.file) {
    log.warn("up: request rejected: no file uploaded");
    return res.status(400).json({ ok: false, error: "no file" });
  }

  if (isSyncing) {
    log.warn("up: request rejected: sync already in progress");
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
      log.warn("up: no /export/*.json found in ZIP");
      return res.status(400).json({ ok: false, error: "no /export/*.json found in ZIP" });
    }
    log.error("up: failed:", msg);
    return res.status(500).json({ ok: false, error: msg });
  } finally {
    isSyncing = false;
    log.info("up: isSyncing reset to false");
  }
});

/**
 * @openapi
 * /api/sync/process-stream:
 *   get:
 *     operationId: syncProcessStream
 *     summary: Stream sync process events
 *     tags: [Sync]
 *     responses:
 *       200:
 *         description: Event stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get("/process-stream", (req, res) => {
  const sse = createSSE(res);
  const off = SyncBus.subscribe(({ type, data }) => sse.send(type as any, data));
  res.on("close", () => { off(); sse.close(); });
});

export default router;
