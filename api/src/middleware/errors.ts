import type { ErrorRequestHandler, RequestHandler } from "express";
import { rootLog } from "../logger";

const log = rootLog.child("errors");

export const notFoundHandler = (): RequestHandler => (req, res) => {
    res.status(404).json({ ok: false, error: "not_found", path: req.originalUrl });
};

export const errorHandler = (): ErrorRequestHandler => (err, _req, res, _next) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = String(err?.message || err || "internal_error");
    if (status >= 500) {
        log.error("unhandled error", { status, message });
    }
    res.status(status).json({ ok: false, error: message });
};
