import express from "express";
import { AccountsService } from "../services/AccountsService";

const router = express.Router();

router.post("/register", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    const r = await AccountsService.register(email, password);
    if (!r.ok) return res.status(409).json({ ok: false, error: r.error });
    res.json({ ok: true });
});

router.post("/login", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    const ok = await AccountsService.login(email, password);
    if (!ok) return res.status(401).json({ ok: false, error: "invalid_credentials" });
    res.json({ ok: true });
});

router.get("/verify", async (req, res) => {
    const email = String(req.header("x-auth-email") || "").toLowerCase();
    const password = String(req.header("x-auth-password") || "");
    const ok = await AccountsService.isAuthorized(email, password);
    if (!ok) return res.status(401).json({ ok: false, error: "unauthorized" });
    res.json({ ok: true });
});

router.get("/status", async (_req, res) => {
    const admin = await AccountsService.currentAdmin();
    res.json({ hasAdmin: !!admin, admin: admin || null });
});

export default router;
