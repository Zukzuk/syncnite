import type { RequestHandler } from "express";

export function requestLogger(): RequestHandler {
    return (req, res, next) => {
        const started = Date.now();
        const { method, originalUrl } = req;
        res.on("finish", () => {
            const ms = Date.now() - started;
            console.log(`[req] ${method} ${originalUrl} → ${res.statusCode} (${ms}ms)`);
        });
        next();
    };
}
