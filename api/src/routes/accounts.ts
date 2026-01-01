import express from "express";
import { AccountsService } from "../services/AccountsService";
import { requirePlayniteAdminSession, requireBareAdminSession, requireSession } from "../middleware/requireAuth";

const router = express.Router();

/** 
 * POST /api/v1/accounts/register/admin
 * Register a new admin account.
 * Fails if an admin already exists.
 */
router.post("/register/admin", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    const r = await AccountsService.registerAdmin(email, password);
    if (!r.ok) return res.status(409).json({ ok: false, error: r.error });
    res.json({ ok: true });
});

/**
 * POST /api/v1/accounts/admin/release
 * Releases the admin role from the currently authenticated admin account.
 * After this, there will be no admin account until a new one is registered.
 */
router.post("/admin/release", requirePlayniteAdminSession, async (req, res) => {
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

/**
 * POST /api/v1/accounts/register/user
 * Register a new user account.
 * Fails if no admin exists or if the user already exists.
 */
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

/**
 * POST /api/v1/accounts/login
 * Logs in a user.
 */
router.post("/login", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    const ok = await AccountsService.login(email, password);
    if (!ok) return res.status(401).json({ ok: false, error: "invalid_credentials" });
    const role = await AccountsService.getRole(email);
    res.json({ ok: true, email, role });
});

/**
 * GET /api/v1/accounts/status
 * Returns whether an admin account exists.
 */
router.get("/status", async (_req, res) => {
    const hasAdmin = await AccountsService.hasAdmin();
    res.json({ hasAdmin });
});

/**
 * GET /api/v1/accounts/verify
 * Verifies the current session.
 */
router.get("/verify", requireSession, async (req, res) => {
    res.json(req.auth);
});

/**
 * GET /api/v1/accounts/verify/admin
 * Verifies the current session is for an admin account.
 */
router.get("/verify/admin", requirePlayniteAdminSession, async (req, res) => {
    res.json(req.auth);
});

/**
 * GET /api/v1/accounts/users
 * Returns all registered user details.
 */
router.get("/users", requireBareAdminSession, async (req, res) => {
    const users = await AccountsService.getUsers();
    res.json({ users });
});



export default router;
