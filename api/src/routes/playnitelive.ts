import express from "express";
import multer from "multer";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { INPUT_DIR, DATA_DIR } from "../helpers";

const router = express.Router();

/**
 * @openapi
 * /api/playnitelive/push:
 *   post:
 *     summary: Push the current list of installed Playnite games (GUIDs).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [installed]
 *             properties:
 *               installed:
 *                 type: array
 *                 description: Array of Playnite Game IDs that are currently installed.
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Write result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *       400:
 *         description: Invalid payload.
 *       500:
 *         description: Server error.
 */
router.post("/push", async (req, res) => {
    try {
        const payload = req.body;
        if (!payload || !Array.isArray(payload.installed)) {
            return res.status(400).json({ ok: false, error: "Body must be { installed: string[] }" });
        }
        const uniq = Array.from(new Set(payload.installed.map((s: string) => String(s))));
        const out = { installed: uniq, updatedAt: new Date().toISOString(), source: "playnite-extension" };
        await fs.writeFile(join(DATA_DIR, "local.playnite.installed.json"), JSON.stringify(out, null, 2), "utf8");
        return res.json({ ok: true, count: uniq.length });
    } catch (e: any) {
        return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
});

export default router;
