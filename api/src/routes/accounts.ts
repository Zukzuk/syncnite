import express from "express";
import { AccountsService } from "../services/AccountsService";
import { requireAdminSession, requireSession } from "../middleware/requireAuth";

const router = express.Router();

router.post("/register/admin", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    const r = await AccountsService.registerAdmin(email, password);
    if (!r.ok) return res.status(409).json({ ok: false, error: r.error });
    res.json({ ok: true });
});

router.post("/admin/release", requireAdminSession, async (req, res) => {
    const email = req.auth?.email;
    if (!email) {
        return res.status(400).json({ ok: false, error: "missing_auth" });
    }

    const r = await AccountsService.removeAdmin(email);
    if (!r.ok) {
        if (r.error === "not_admin") {
            return res.status(409).json({ ok: false, error: "not_admin" });
        }
        return res.status(500).json({ ok: false, error: r.error });
    }

    return res.json({ ok: true });
});

router.post("/register/user", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    const r = await AccountsService.registerUser(email, password);
    if (!r.ok) {
        if (r.error === "no_admin_yet") return res.status(403).json({ ok: false, error: r.error });
        return res.status(409).json({ ok: false, error: r.error });
    }
    res.json({ ok: true });
});

router.post("/login", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    const ok = await AccountsService.login(email, password);
    if (!ok) return res.status(401).json({ ok: false, error: "invalid_credentials" });
    const role = await AccountsService.getRole(email);
    res.json({ ok: true, email, role });
});

router.get("/status", async (_req, res) => {
    const hasAdmin = await AccountsService.hasAdmin();
    res.json({ hasAdmin });
});

router.get("/verify/admin", requireAdminSession, async (req, res) => {
    res.json(req.auth);
});

router.get("/verify", requireSession, async (req, res) => {
    res.json(req.auth);
});

export default router;
