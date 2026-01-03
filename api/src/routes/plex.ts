import express from "express";
import { requireBareAdminSession, requireSession } from "../middleware/requireAuth";
import { PlexService } from "../services/PlexService";
import { rootLog } from "../logger";

const router = express.Router();
const log = rootLog.child("route:plex");

// GET /api/v1/plex
router.get("/", requireBareAdminSession, async (req, res) => {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ ok: false, error: "missing_auth" });

  try {
    const status = await PlexService.getStatus(email);
    return res.json(status);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// POST /api/v1/plex/auth/start
router.post("/auth/start", requireBareAdminSession, async (req, res) => {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ ok: false, error: "missing_auth" });

  const serverUrl = String(req.body?.serverUrl ?? "").trim();
  if (!serverUrl) return res.status(400).json({ ok: false, error: "missing_server_url" });

  // where Plex sends the user back after auth (your web UI URL)
  const forwardUrl = String(process.env.SERVER_REALM) + String(process.env.PLEX_LINK_REDIRECT);
  if (!forwardUrl) return res.status(500).json({ ok: false, error: "missing_forward_url" });

  try {
    const { authUrl, pinId } = await PlexService.startAuth(email, serverUrl, forwardUrl);
    return res.json({ ok: true, authUrl, pinId });
  } catch (e: any) {
    log.warn("plex auth start failed", { err: String(e?.message ?? e) });
    return res.status(400).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// POST /api/v1/plex/auth/poll
router.post("/auth/poll", requireBareAdminSession, async (req, res) => {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ ok: false, error: "missing_auth" });

  const pinId = req.body?.pinId != null ? Number(req.body.pinId) : undefined;

  try {
    const r = await PlexService.pollAuth(email, pinId);
    return res.json({ ok: true, ...r });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// POST /api/v1/plex/unlink
router.post("/unlink", requireBareAdminSession, async (req, res) => {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ ok: false, error: "missing_auth" });

  try {
    await PlexService.unlink(email);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// POST /api/v1/plex/sync
router.post("/sync", requireBareAdminSession, async (req, res) => {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ ok: false, error: "missing_auth" });

  try {
    // For now, run inline (simple). If you prefer “fire-and-forget”, we can move to WorkerService.
    const result = await PlexService.sync(email);
    return res.json(result);
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// GET /api/v1/plex/collection/:collection
router.get("/collection/:collection", requireSession, async (req, res) => {
  try {
    const rows = await PlexService.listCollection(req.params.collection);
    return res.json(rows);
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: String(e?.message ?? e) });
  }
});


export default router;
