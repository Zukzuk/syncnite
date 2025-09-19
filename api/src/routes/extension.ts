import express from "express";
import path from "path";

const extensionRouter = express.Router();

/**
 * @openapi
 * /api/extension/download:
 *   get:
 *     summary: Download the latest Playnite extension.
 *     responses:
 *       200:
 *         description: The extension file
 */
extensionRouter.get("/download", (_req, res) => {
  const file = path.resolve(__dirname, "../../playnite/PlayniteViewerBridge/playnite-viewer-bridge-1.0.0.pext");
  res.download(file, "playnite-viewer-bridge.pext");
});

export default extensionRouter;