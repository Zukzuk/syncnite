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
  log.info("download: request received");

  try {
    log.info("Resolving latest extension package", { version: APP_VERSION });

    const filePath = `${EXT_DIR}/latest.pext`;
    const downloadName = `syncnite-bridge-${APP_VERSION}.pext`;

    log.info("Resolved extension package", { filePath, downloadName });

    res.download(filePath, downloadName, (err) => {
      if (err) {
        log.error("download: error during download:", String(err?.message || err));
        if (!res.headersSent) {
          res.status(500).json({ ok: false, error: String(err?.message || err) });
        }
      } else {
        log.info(`download: successfully sent ${downloadName}`);
      }
    });
  } catch (e: any) {
    log.error("download: failed:", String(e?.message || e));
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
