import express from "express";
import { AccountsService } from "../services/AccountsService";
import { UsersService } from "../services/UsersService";
const router = express.Router();

/** Register a new (non-admin) user — only allowed once an admin exists */
router.post("/register", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    // allow user creation only if admin already exists
    const admin = await AccountsService.currentAdmin();
    if (!admin) return res.status(400).json({ ok: false, error: "no_admin" });

    const r = await UsersService.register(email, password);
    if (!r.ok) return res.status(409).json({ ok: false, error: r.error });
    res.json({ ok: true });
});

/** Login as user */
router.post("/login", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    const ok = await UsersService.login(email, password);
    if (!ok) return res.status(401).json({ ok: false, error: "invalid_credentials" });
    res.json({ ok: true });
});

/** Verify user (header-based, mirrors /accounts/verify) */
router.get("/verify", async (req, res) => {
    const email = String(req.header("x-auth-email") || "").toLowerCase();
    const password = String(req.header("x-auth-password") || "");
    const ok = await UsersService.isAuthorized(email, password);
    if (!ok) return res.status(401).json({ ok: false, error: "unauthorized" });
    res.json({ ok: true });
});

/** List all users — admin only */
router.get("/list", async (req, res) => {
    const email = String(req.header("x-auth-email") || "").toLowerCase();
    const password = String(req.header("x-auth-password") || "");
    const isAdmin = await AccountsService.isAuthorized(email, password);
    if (!isAdmin) return res.status(401).json({ ok: false, error: "unauthorized" });

    const list = await UsersService.listEmails();
    res.json({ ok: true, users: list });
});

export default router;
