import express from "express";

const router = express.Router();
const APP_VERSION = process.env.APP_VERSION ?? 'dev';

/**
 * @openapi
 * /api/extension/download:
 *   get:
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
 *         description: Extension package not found on the server.
 *       500:
 *         description: Server error while reading the extension package.
 */
router.get("/download", (_req, res) => {
  const file = "/extension/latest.pext";
  res.download(file, `syncnite-bridge-${APP_VERSION}.pext`);
});

export default router;