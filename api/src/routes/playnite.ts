import express from "express";
import multer from "multer";
import { requireAdminSession, requireSession } from "../middleware/requireAuth";
import { rootLog } from "../logger";
import { PlayniteService } from "../services/PlayniteService";
import { PlayniteClientManifest, PlayniteError } from "../types/types";

const log = rootLog.child("route:playnite");
const router = express.Router();
const playniteService = new PlayniteService();
const mediaUpload = multer({ storage: multer.memoryStorage() });

function handlePlayniteError(res: express.Response, err: unknown) {
    if (err instanceof PlayniteError) {
        return res.status(err.status).json({ ok: false, error: err.code });
    }
    log.warn("unhandled playnite error", {
        err: String((err as any)?.message ?? err),
    });
    return res.status(500).json({ ok: false, error: "internal_error" });
}

/**
 * POST /api/v1/playnite/installed
 */
router.post("/installed", requireSession, async (req, res) => {
    try {
        const email =
            (req as any).auth?.email ??
            String(req.header("x-auth-email") || "").toLowerCase();

        const count = await playniteService.pushInstalled(
            req.body?.installed,
            email
        );
        return res.json({ ok: true, count });
    } catch (e) {
        return handlePlayniteError(res, e);
    }
});

/**
 * POST /api/v1/playnite/snapshot
 */
router.post("/snapshot", requireAdminSession, async (req, res) => {
    try {
        const email =
            (req as any).auth?.email ??
            String(req.header("x-auth-email") || "").toLowerCase();

        await playniteService.pushSnapshot(req.body, email);
        return res.json({ ok: true });
    } catch (e) {
        return handlePlayniteError(res, e);
    }
});

/**
 * POST /api/v1/playnite/delta
 */
router.post("/delta", requireAdminSession, async (req, res) => {
    try {
        const body = (req.body ?? {}) as PlayniteClientManifest;
        const delta = await playniteService.computeDelta(body);
        return res.json({ ok: true, delta });
    } catch (e) {
        return handlePlayniteError(res, e);
    }
});

/**
 * PUT /api/v1/playnite/media/*
 */
router.put(
    "/media/*",
    requireAdminSession,
    express.raw({ type: "application/octet-stream", limit: "50mb" }),
    mediaUpload.any(),
    async (req, res) => {
        try {
            let buffer: Buffer | null = null;

            if (Buffer.isBuffer(req.body)) {
                buffer = req.body as Buffer;
            } else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const f = req.files[0] as Express.Multer.File;
                buffer = f.buffer;
            } else if (req.body && typeof req.body === "string") {
                buffer = Buffer.from(req.body);
            } else if (req.body && typeof req.body === "object") {
                const b64 = (req.body as any).data;
                if (b64 && typeof b64 === "string") {
                    buffer = Buffer.from(b64, "base64");
                }
            }

            if (!buffer || !buffer.length) {
                return res
                    .status(400)
                    .json({ ok: false, error: "empty_body" });
            }

            const tail = req.params[0] ?? "";
            const wantHash = String(req.header("x-hash") ?? "");

            const { status, bytes } = await playniteService.putMedia(
                tail,
                buffer,
                wantHash || undefined
            );

            if (status === 204) {
                return res.status(204).end();
            }

            return res.status(status).json({ ok: true, bytes });
        } catch (e) {
            return handlePlayniteError(res, e);
        }
    }
);

/**
 * GET /api/v1/playnite/media/*
 */
router.get("/media/*", requireSession, async (req, res) => {
    try {
        const tail = req.params[0] ?? "";
        const abs = await playniteService.getMediaPath(tail);

        return res.sendFile(abs, (err) => {
            if (err) {
                log.warn("media get failed", {
                    err: String((err as any)?.message ?? err),
                    tail,
                });
                if (!res.headersSent) {
                    res
                        .status(500)
                        .json({ ok: false, error: "media_stream_error" });
                }
            }
        });
    } catch (e) {
        if (e instanceof PlayniteError) {
            return res
                .status(e.status)
                .json({ ok: false, error: e.code });
        }
        log.warn("media get failed", {
            err: String((e as any)?.message ?? e),
        });
        return res
            .status(400)
            .json({ ok: false, error: "media_get_failed" });
    }
});

/**
 * GET /api/v1/playnite/collection/:collection
 */
router.get("/collection/:collection", requireSession, async (req, res) => {
    try {
        const rows = await playniteService.listCollection(
            req.params.collection
        );
        // keep original response shape: raw array
        return res.json(rows);
    } catch (e) {
        return handlePlayniteError(res, e);
    }
});

/**
 * PUT /api/v1/playnite/:collection/:id
 */
router.put("/:collection/:id", requireAdminSession, async (req, res) => {
    try {
        const { status, body } = await playniteService.upsertEntity(
            req.params.collection,
            req.params.id,
            req.body
        );

        if (status === 204) {
            return res.status(204).end();
        }
        return res.status(status).json(body);
    } catch (e) {
        return handlePlayniteError(res, e);
    }
});

/**
 * DELETE /api/v1/playnite/:collection/:id
 */
router.delete("/:collection/:id", requireAdminSession, async (req, res) => {
    try {
        const { status } = await playniteService.deleteEntity(
            req.params.collection,
            req.params.id
        );
        return res.status(status).end();
    } catch (e) {
        return handlePlayniteError(res, e);
    }
});

export default router;
