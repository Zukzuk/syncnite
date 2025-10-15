import type { RequestHandler } from "express";
import { rootLog } from "../logger";

const log = rootLog.child("http");

export function requestLogger(): RequestHandler {
    return (req, res, next) => {
        const started = Date.now();
        const { method, originalUrl } = req;
        res.on("finish", () => {
            const ms = Date.now() - started;
            log.trace("request", { method, url: originalUrl, status: res.statusCode, ms });
        });
        next();
    };
}
