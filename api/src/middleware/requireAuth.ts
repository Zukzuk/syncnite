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

export async function requireSession(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) {
    const email = String(req.header("x-auth-email") || "").toLowerCase();
    const password = String(req.header("x-auth-password") || "");

    const ok = await AccountsService.login(email, password);
    if (!ok) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const role = await AccountsService.getRole(email);
    req.auth = {
        email,
        role,
    };

    next();
}

export async function requireAdminSession(
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

    // admin check (hard fail if mismatch)
    const role = await AccountsService.getRole(email);
    if (role !== "admin") {
        return res
            .status(403)
            .json({
                ok: false,
                error: "forbidden",
                message: "Admin privileges required",
            });
    }

    req.auth = {
        email,
        role,
    };

    next();
}