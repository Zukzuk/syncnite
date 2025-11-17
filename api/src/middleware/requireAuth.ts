import express from "express";
import { AccountsService, Role } from "../services/AccountsService";

// augment Express.Request so routes can use req.auth
declare global {
    namespace Express {
        interface Request {
            auth?: {
                email: string;
                role: Role;
            };
        }
    }
}

/** 
 * Middleware to require a valid user session.
 */
export async function requireSession(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) {
    const email = String(req.header("x-auth-email") || "").toLowerCase();
    const password = String(req.header("x-auth-password") || "");

    // auth check
    const ok = await AccountsService.login(email, password);
    if (!ok) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    // get role
    const role = await AccountsService.getRole(email);

    req.auth = {
        email,
        role,
    };

    next();
}

/**
 * Middleware to require a valid admin user session.
 *
 * Also enforces the "single admin installation" rule using X-Client-Id:
 * - First admin call with a given clientId binds that clientId to the admin account.
 * - Later calls must use the same clientId.
 * - Different clientId → 403 admin_locked_elsewhere.
 */
export async function requireAdminSession(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) {
    const email = String(req.header("x-auth-email") || "").toLowerCase();
    const password = String(req.header("x-auth-password") || "");
    const clientId = String(req.header("x-client-id") || "");

    // clientId check
    if (!clientId) {
        return res.status(403).json({
            ok: false,
            error: "missing_client_id",
            message: "X-Client-Id header is required for admin requests.",
        });
    }

    // auth check
    const ok = await AccountsService.login(email, password);
    if (!ok) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    // role check
    const role = await AccountsService.getRole(email);
    if (role !== "admin") {
        return res.status(403).json({
            ok: false,
            error: "forbidden",
            message: "Admin privileges required",
        });
    }

    // bind / validate admin-clientId check
    const bindResult = await AccountsService.bindAdminClient(email, clientId);
    if (!bindResult.ok) {
        if (bindResult.error === "admin_locked_elsewhere") {
            return res.status(403).json({
                ok: false,
                error: "admin_locked_elsewhere",
                message: "Admin login is locked to another Syncnite Bridge installation.",
            });
        }

        return res.status(403).json({
            ok: false,
            error: bindResult.error,
        });
    }

    req.auth = {
        email,
        role,
    };

    next();
}