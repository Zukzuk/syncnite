import express from "express";
import multer from "multer";
import { BackupService } from "../services/BackupService";
import { UPLOADS_DIR } from "../constants";
import { rootLog } from "../logger";
import { requireAdminSession } from "../middleware/requireAuth";

const router = express.Router();
const upload = multer({ dest: UPLOADS_DIR });
const backupService = new BackupService();
const log = rootLog.child("route:backup");

router.post("/upload", requireAdminSession, upload.single("file"), async (req, res) => {
  log.info("upload: incoming");

  try {
    if (!req.file) {
      log.warn("upload: no file field");
      return res.status(400).json({ ok: false, error: "no file" });
    }

    const origName = req.file.originalname;
    const tmpPath = req.file.path;
    const size = req.file.size ?? 0;

    log.info("upload: received", { origName, size, tmpPath });

    const safe = await backupService.storeUploadedFile(tmpPath, origName);
    return res.json({ ok: true, file: safe });
  } catch (e: any) {
    log.error("upload: failed", { error: String(e?.message || e) });
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/process", requireAdminSession, async (req, res) => {
  const filename = String(req.body?.filename ?? "");
  const password = String(req.body?.password ?? "");

  if (!filename || !/\.zip$/i.test(filename)) {
    return res.status(400).json({ ok: false, error: "filename missing or not .zip" });
  }

  log.info("backup/process: started", { filename });

  try {
    await backupService.processZipStream({ filename, password });

    // The following lines are automatically broadcast to the SSE stream
    log.info("backup/process: done", { phase: "backup", percent: 100 });

    return res.json({ ok: true });
  } catch (e: any) {
    log.error("backup/process: failed", { error: String(e?.message || e) });
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
