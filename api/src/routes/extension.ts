import express from "express";
import { ExtensionService } from "../services/ExtensionService";

const router = express.Router();
const extensionService = new ExtensionService();

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
  console.log("[extension/download] Request received");

  try {
    const { filePath, downloadName } = extensionService.getLatest();
    res.download(filePath, downloadName, (err) => {
      if (err) {
        console.error("[extension/download] ERROR during download:", String(err?.message || err));
        if (!res.headersSent) {
          res.status(500).json({ ok: false, error: String(err?.message || err) });
        }
      } else {
        console.log(`[extension/download] Successfully sent ${downloadName}`);
      }
    });
  } catch (e: any) {
    console.error("[extension/download] ERROR:", String(e?.message || e));
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
