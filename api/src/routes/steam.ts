import express from "express";
import { rootLog } from "../logger";
import { requireSession } from "../middleware/requireAuth";
import { SteamService } from "../services/SteamService";
import { SteamError } from "../types/types";

const router = express.Router();
const log = rootLog.child("route:steam");

function handleSteamError(res: express.Response, err: unknown) {
    if (err instanceof SteamError) {
        return res.status(err.status).json({ ok: false, error: err.code });
    }

    log.warn("unhandled steam error", { err: String((err as any)?.message ?? err) });
    return res.status(500).json({ ok: false, error: "internal_error" });
}

/**
 * GET /api/v1/steam
 * Returns Steam connection status for the current Syncnite account.
 */
router.get("/", requireSession, async (req, res) => {
    const email = req.auth?.email;
    if (!email) {
        return res.status(401).json({ ok: false, error: "missing_auth" });
    }

    try {
        const status = await SteamService.getConnectionStatus(email);
        return res.json({ ok: true, ...status });
    } catch (e) {
        return handleSteamError(res, e);
    }
});

/**
 * POST /api/v1/steam/auth/start
 * Starts the Steam OpenID flow for the currently authenticated Syncnite account.
 */
router.post("/auth/start", requireSession, async (req, res) => {
    const email = req.auth?.email;
    if (!email) {
        return res.status(401).json({ ok: false, error: "missing_auth" });
    }

    try {
        const { redirectUrl } = await SteamService.startAuthForEmail(email);
        return res.json({ ok: true, redirectUrl });
    } catch (e) {
        return handleSteamError(res, e);
    }
});

/**
 * GET /api/v1/steam/auth/callback
 * Steam redirects back here after login.
 */
router.get("/auth/callback", async (req, res) => {
    try {
        const { redirectTo } = await SteamService.handleAuthCallback(req);
        return res.redirect(302, redirectTo);
    } catch (e) {
        if (e instanceof SteamError) {
            return res.status(e.status).send(e.code);
        }
        log.warn("unhandled steam callback error", {
            err: String((e as any)?.message ?? e),
        });
        return res.status(500).send("internal_error");
    }
});

/**
 * GET /api/v1/steam/wishlist
 * Returns the last synced wishlist snapshot.
 */
router.get("/wishlist", requireSession, async (req, res) => {
    const email = req.auth?.email;
    if (!email) {
        return res.status(401).json({ ok: false, error: "missing_auth" });
    }

    try {
        const snapshot = await SteamService.getWishlistSnapshot(email);
        return res.json({ ok: true, ...snapshot });
    } catch (e) {
        return handleSteamError(res, e);
    }
});

/**
 * POST /api/v1/steam/wishlist/sync
 * Starts a background Steam wishlist sync.
 */
router.post("/wishlist/sync", requireSession, async (req, res) => {
    const email = req.auth?.email;
    if (!email) {
        return res.status(401).json({ ok: false, error: "missing_auth" });
    }

    try {
        const snapshot = await SteamService.startWishlistSync(email);
        return res.json({ ok: true, ...snapshot });
    } catch (e) {
        return handleSteamError(res, e);
    }
});

export default router;
