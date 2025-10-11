import express from "express";
import { AccountsService } from "../services/AccountsService";

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Accounts
 *     description: Admin account registration, login, and verification.
 */

/**
 * @openapi
 * /api/accounts/register:
 *   post:
 *     operationId: registerAccount
 *     summary: Register a new admin account
 *     description: Register the single admin account. Fails if an admin already exists.
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: Account registered.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 error:
 *                   type: string
 *                   enum: [admin_exists, missing_fields]
 *       400:
 *         $ref: '#/components/responses/Error400'
 *       409:
 *         description: Conflict - admin already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.post("/register", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    const r = await AccountsService.register(email, password);
    if (!r.ok) return res.status(409).json({ ok: false, error: r.error });
    res.json({ ok: true });
});

/**
 * @openapi
 * /api/accounts/login:
 *   post:
 *     operationId: loginAccount
 *     summary: Log in to the admin account
 *     description: Log in as the admin account.
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 error:
 *                   type: string
 *                   enum: [invalid_credentials, missing_fields]
 *       400:
 *         $ref: '#/components/responses/Error400'
 *       401:
 *         description: Unauthorized - invalid credentials.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.post("/login", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "missing_fields" });

    const ok = await AccountsService.login(email, password);
    if (!ok) return res.status(401).json({ ok: false, error: "invalid_credentials" });
    res.json({ ok: true });
});

/**
 * @openapi
 * /api/accounts/verify:
 *   get:
 *     operationId: verifyAccount
 *     summary: Verify the admin account
 *     description: Returns ok if the provided headers match the stored admin credentials.
 *     tags: [Accounts]
 *     security:
 *       - XAuthEmail: []
 *         XAuthPassword: []
 *     parameters:
 *       - in: header
 *         name: x-auth-email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *       - in: header
 *         name: x-auth-password
 *         required: true
 *         schema:
 *           type: string
 *           format: password
 *     responses:
 *       200:
 *         description: Verification successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 error:
 *                   type: string
 *                   enum: [unauthorized]
 *       401:
 *         $ref: '#/components/responses/Error401'
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.get("/verify", async (req, res) => {
    const email = String(req.header("x-auth-email") || "").toLowerCase();
    const password = String(req.header("x-auth-password") || "");
    const ok = await AccountsService.isAuthorized(email, password);
    if (!ok) return res.status(401).json({ ok: false, error: "unauthorized" });
    res.json({ ok: true });
});

/**
 * @openapi
 * /api/accounts/status:
 *   get:
 *     operationId: getAccountStatus
 *     summary: Get the status of the admin account
 *     description: Returns information about the current admin account status.
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: Status retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasAdmin:
 *                   type: boolean
 *                 admin:
 *                   type: string
 *                   format: email
 *                   nullable: true
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.get("/status", async (_req, res) => {
    const admin = await AccountsService.currentAdmin();
    res.json({ hasAdmin: !!admin, admin: admin || null });
});

export default router;
