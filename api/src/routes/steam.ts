import express from "express";
import crypto from "node:crypto";
import { rootLog } from "../logger";
import { requireSession } from "../middleware/requireAuth";
import { AccountsService } from "../services/AccountsService";
import { SteamService } from "../services/SteamService";

const router = express.Router();
const log = rootLog.child("route:steam");

// In-memory link-token store: linkToken -> { email, createdAt }
const LINK_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const linkTokens = new Map<string, { email: string; createdAt: number }>();

function createLinkToken(email: string): string {
    const token = crypto.randomBytes(16).toString("hex");
    linkTokens.set(token, { email, createdAt: Date.now() });
    return token;
}

function consumeLinkToken(token: string): string | null {
    const entry = linkTokens.get(token);
    if (!entry) return null;
    linkTokens.delete(token);

    if (Date.now() - entry.createdAt > LINK_TOKEN_TTL_MS) {
        log.warn("link token expired", { token, email: entry.email });
        return null;
    }

    return entry.email;
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

    const acc = await AccountsService.getAccount(email);
    if (!acc) {
        return res.status(404).json({ ok: false, error: "not_found" });
    }

    if (!acc.steam) {
        return res.json({ ok: true, connected: false });
    }

    const { steam } = acc;
    return res.json({
        ok: true,
        connected: true,
        steam: {
            steamId: steam.steamId,
            linkedAt: steam.linkedAt,
        },
    });
});

/**
 * POST /api/v1/steam/auth/start
 * Starts the Steam OpenID flow for the currently authenticated Syncnite account.
 * Returns JSON { ok: true, redirectUrl } that the frontend should navigate to.
 */
router.post("/auth/start", requireSession, async (req, res) => {
    const email = req.auth?.email;
    if (!email) {
        return res.status(401).json({ ok: false, error: "missing_auth" });
    }

    try {
        const token = createLinkToken(email);
        const redirectUrl = await SteamService.getAuthRedirectUrl(token);

        log.info("steam auth start", { email, token });

        return res.json({ ok: true, redirectUrl });
    } catch (e: any) {
        log.warn("steam auth start failed", { err: String(e?.message ?? e) });
        return res.status(500).json({ ok: false, error: "steam_auth_start_failed" });
    }
});

/**
 * GET /api/v1/steam/auth/callback
 * Steam redirects back here after login.
 *  - verify the OpenID response
 *  - map linkToken -> email
 *  - store steamId on that account
 *  - redirect the browser back to the SPA (Account page)
 */
router.get("/auth/callback", async (req, res) => {
    try {
        const linkToken = typeof req.query.linkToken === "string"
            ? req.query.linkToken
            : "";

        if (!linkToken) {
            log.warn("steam callback missing linkToken");
            return res.status(400).send("Missing link token");
        }

        const email = consumeLinkToken(linkToken);
        if (!email) {
            log.warn("steam callback invalid/expired linkToken", { linkToken });
            return res.status(400).send("Invalid or expired link token");
        }

        const { steamId } = await SteamService.authenticateOpenId(req);

        const linkedAt = new Date().toISOString();
        const r = await AccountsService.setSteamConnection(email, {
            steamId,
            linkedAt,
        });

        if (!r.ok) {
            log.warn("setSteamConnection failed", { email, steamId, error: r.error });
            return res.status(500).send("Failed to persist Steam connection");
        }

        log.info("steam linked", { email, steamId });

        // Optional: initial wishlist sync could run here.
        // We'll keep it simple and let the user click "Sync wishlist" from the UI.

        const redirectTo = process.env.STEAM_LINK_REDIRECT || "/account?steamLinked=1";
        return res.redirect(302, redirectTo);
    } catch (e: any) {
        log.warn("steam auth callback failed", { err: String(e?.message ?? e) });
        return res.status(401).send("Steam authentication failed");
    }
});

/**
 * GET /api/v1/steam/wishlist
 * Returns the last synced wishlist snapshot from the per-account file.
 */
router.get("/wishlist", requireSession, async (req, res) => {
    const email = req.auth?.email;
    if (!email) {
        return res.status(401).json({ ok: false, error: "missing_auth" });
    }

    const acc = await AccountsService.getAccount(email);
    if (!acc) {
        return res.status(404).json({ ok: false, error: "not_found" });
    }

    const snapshot = await AccountsService.getSteamWishlistFile(email);

    if (!snapshot) {
        return res.json({
            ok: true,
            lastSynced: null,
            items: [],
        });
    }

    return res.json({
        ok: true,
        lastSynced: snapshot.lastSynced ?? null,
        items: snapshot.items ?? [],
    });
});

/**
 * POST /api/v1/steam/wishlist/sync
 * Starts a background Steam wishlist sync for the linked account.
 * Immediately returns 200 while the server incrementally writes the snapshot.
 */
router.post("/wishlist/sync", requireSession, async (req, res) => {
    try {
        const email = req.auth?.email;
        if (!email) {
            return res.status(401).json({ ok: false, error: "missing_auth" });
        }

        const acc = await AccountsService.getAccount(email);
        if (!acc || !acc.steam) {
            return res.status(400).json({ ok: false, error: "steam_not_linked" });
        }

        const startedAt = new Date().toISOString();

        // Initialize / reset the snapshot file with an empty items array
        const initSnapshot = {
            lastSynced: startedAt,
            items: [] as any[],
        };

        const r = await AccountsService.setSteamWishlistFile(email, initSnapshot);
        if (!r.ok) {
            return res.status(500).json({ ok: false, error: r.error });
        }

        // Fire-and-forget background job to stream entries into the snapshot
        void (async () => {
            try {
                await SteamService.getWishlistWithDetails(
                    acc.steam!.steamId,
                    "NL",
                    "en",
                    async (entry) => {
                        await AccountsService.appendSteamWishlistItem(email, entry);
                    },
                );
                log.info("steam wishlist sync completed", { email });
            } catch (e: any) {
                log.warn("background steam wishlist sync failed", {
                    email,
                    err: String(e?.message ?? e),
                });
            }
        })();

        // Immediately return OK so the client can start polling /steam/wishlist
        return res.json({
            ok: true,
            lastSynced: startedAt,
            items: [], // initial empty snapshot; will fill via polling
        });
    } catch (e: any) {
        log.warn("steam wishlist sync failed", { err: String(e?.message ?? e) });
        return res.status(400).json({ ok: false, error: String(e?.message ?? e) });
    }
});

export default router;
