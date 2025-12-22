import express from "express";
import { rootLog } from "../logger";
import { EXT_DIR } from "../constants";

const router = express.Router();
const log = rootLog.child("route:extension");
const APP_VERSION = process.env.APP_VERSION ?? "dev";

/**
 * GET /api/v1/extension/download
 * Downloads the latest version of the browser extension package.
 * The package is a .pext file that can be loaded into the browser extension.
 */
router.get("/download", (_req, res) => {
  try {
    const filePath = `${EXT_DIR}/latest.pext`;
    const downloadName = `syncnite-bridge-${APP_VERSION}.pext`;
    res.download(filePath, downloadName, (err) => {
      if (err) {
        log.error("error during download:", String(err?.message || err));
        if (!res.headersSent) {
          res.status(500).json({ ok: false, error: String(err?.message || err) });
        }
      } else {
        log.info(`successfully sent ${downloadName}`);
      }
    });
  } catch (e: any) {
    log.error("failed:", String(e?.message || e));
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
