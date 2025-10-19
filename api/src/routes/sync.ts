import express from "express";
import multer from "multer";
import { SyncService } from "../services/SyncService";
import { requireAdmin } from "../middleware/requireAdmin";
import { UPLOADS_DIR } from "../constants";
import { rootLog } from "../logger";

const router = express.Router();
router.use(requireAdmin);
const syncUpload = multer({ dest: UPLOADS_DIR });
const syncService = new SyncService();
const log = rootLog.child("route:sync");

let isSyncing = false;

router.get("/ping", (_req, res) => {
  const APP_VERSION = process.env.APP_VERSION ?? "dev";
  res.json({ message: "ok", version: `v${APP_VERSION}` });
});

router.post("/log", async (req, res) => {
  try {
    const count = log.raw(req.body);
    if (!count) return res.status(400).json({ ok: false, error: "invalid payload" });
    log.debug("sync/log accepted", { count });
    return res.sendStatus(204);
  } catch (e) {
    log.error("sync/log failed", { err: (e as Error).message });
    return res.status(400).json({ ok: false, error: "invalid log payload" });
  }
});

router.post("/push", async (req, res) => {
  log.info("push: incoming request");

  try {
    log.info("push: raw body received", req.body);
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
    const result = await syncService.processZipStream({
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
    if ((e as any).statusCode === 400 || /no (playnite )?library (databases|db) found/i.test(msg)) {
      log.warn("up: no Playnite library databases found in ZIP");
      return res.status(400).json({ ok: false, error: "no Playnite library databases found in ZIP" });
    }
    log.error("up: failed:", msg);
    return res.status(500).json({ ok: false, error: msg });
  } finally {
    isSyncing = false;
    log.info("up: isSyncing reset to false");
  }
});

export default router;
