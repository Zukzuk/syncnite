import express from "express";
import { INPUT_DIR } from "../helpers";
import { ListZipsService } from "../services/ListZipsService";

const router = express.Router();
const listZipsService = new ListZipsService(INPUT_DIR);

/**
 * @openapi
 * tags:
 *   - name: App
 *     description: General application endpoints.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     ZipFile:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: File name of the uploaded ZIP.
 *           example: "2025-09-20-23-10.zip"
 *         size:
 *           type: integer
 *           format: int64
 *           description: File size in bytes.
 *           example: 12345678
 *         mtime:
 *           type: number
 *           format: double
 *           description: Last modified time in milliseconds since Unix epoch.
 *           example: 1695238745123
 */

/**
 * @openapi
 * /api/zips:
 *   get:
 *     operationId: listUploadedZips
 *     summary: List uploaded ZIP files available for import
 *     tags: [App]
 *     responses:
 *       200:
 *         description: A list of ZIP files with basic metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ZipFile'
 *       500:
 *         $ref: '#/components/responses/Error500'
 */
router.get("/zips", async (_req, res) => {
    console.log("[app/zips] Request received");

    try {
        const zips = await listZipsService.get();
        res.json(zips);
    } catch (e: any) {
        console.error("[app/zips] ERROR:", String(e?.message || e));
        res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
});


export default router;
