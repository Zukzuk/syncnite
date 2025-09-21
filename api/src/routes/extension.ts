import express from "express";
import path from "path";

const router = express.Router();

/**
 * @openapi
 * /api/extension/download:
 *   get:
 *     summary: Download the latest Playnite Viewer Bridge extension (.pext)
 *     tags: [Extension]
 *     responses:
 *       200:
 *         description: The extension package.
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *             example: attachment; filename="playnite-viewer-bridge.pext"
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Extension package not found on the server.
 *       500:
 *         description: Server error while reading the extension package.
 */
router.get("/download", (_req, res) => {
  const file = "/extension/latest.pext";
  res.download(file, "playnite-viewer-bridge.pext");
});

export default router;