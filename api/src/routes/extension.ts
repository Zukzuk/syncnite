import express from "express";
import { ExtensionService } from "../services/ExtensionService";
import { rootLog } from "../logger";

const router = express.Router();
const extensionService = new ExtensionService();
const log = rootLog.child("route:extension");

/**
 * @openapi
 * tags:
 *   - name: Extension
 *     description: Manage and download Playnite extensions.
 */

/**
 * @openapi
 * /api/extension/download:
 *   get:
 *     operationId: downloadExtension
 *     summary: Download the latest Syncnite Bridge extension (.pext)
 *     tags: [Extension]
 *     responses:
 *       200:
 *         description: The extension package.
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *             example: attachment; filename="syncnite-bridge.pext"
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         $ref: '#/components/responses/Error404'
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.get("/download", (_req, res) => {
  log.info("download: request received");

  try {
    const { filePath, downloadName } = extensionService.getLatest();
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
