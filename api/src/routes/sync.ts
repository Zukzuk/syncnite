import express from "express";
import multer from "multer";
import { promises as fs } from "node:fs";
import { join, dirname, resolve, sep } from "node:path";
import { requireAdminSession, requireSession } from "../middleware/requireAuth";
import { DATA_DIR } from "../constants";
import { rootLog } from "../logger";
import { SyncService } from "../services/SyncService";

type ClientManifest = {
    // per collection → list of ids known client-side
    json?: Record<string, string[]>; // { "games": ["id1","id2",...], ... }
    // optional installed state summary (opaque to server for now)
    installed?: { count: number; hash?: string };
};

type DeltaManifest = {
    // per collection → ids to create or update on server
    toUpsert: Record<string, string[]>;
    // per collection → ids to delete on server
    toDelete: Record<string, string[]>;
};

const log = rootLog.child("route:sync2");
const router = express.Router();
const syncService = new SyncService();
const DB_ROOT = join(DATA_DIR, "db");
const MEDIA_ROOT = join(DATA_DIR, "libraryfiles");
const COLLECTIONS = new Set([
    "games",
    "companies",
    "tags",
    "sources",
    "platforms",
    "genres",
    "categories",
    "features",
    "series",
    "regions",
    "ageratings",
    "completionstatuses",
    "filterpresets",
    "importexclusions",
]);

const mediaUpload = multer({ storage: multer.memoryStorage() });

async function ensureDir(p: string) {
    await fs.mkdir(p, { recursive: true });
}

function sanitizeId(id: string): string {
    // Keep it conservative: alnum, dash, underscore, and hex GUID braces/parentheses stripped
    const trimmed = String(id ?? "").trim();
    if (!trimmed) throw new Error("missing id");
    const safe = trimmed.replace(/[^A-Za-z0-9_\-.]/g, "");
    if (!safe) throw new Error("invalid id");
    return safe;
}

function sanitizeCollection(col: string): string {
    const c = String(col ?? "").trim().toLowerCase();
    if (!COLLECTIONS.has(c)) throw new Error(`unknown collection: ${c}`);
    return c;
}

function resolveDocPath(collection: string, id: string) {
    return join(DB_ROOT, collection, `${id}.json`);
}

async function readJsonIfExists(p: string): Promise<any | null> {
    try {
        const buf = await fs.readFile(p, "utf8");
        return JSON.parse(buf);
    } catch (e: any) {
        if (e?.code === "ENOENT") return null;
        throw e;
    }
}

async function writeJson(p: string, obj: any) {
    await ensureDir(dirname(p));
    const data = JSON.stringify(obj, null, 2);
    await fs.writeFile(p, data, "utf8");
}

function safeJoinMedia(root: string, urlTail: string) {
    // Accept /media/<any/relative/path> → map to MEDIA_ROOT/that/path
    const rel = urlTail.replace(/^\/+/, "");
    const abs = resolve(root, rel);
    if (!abs.startsWith(resolve(root) + sep)) {
        throw new Error("invalid media path");
    }
    return abs;
}

async function fileStatOrNull(p: string) {
    try { return await fs.stat(p); } catch { return null; }
}

function sameJson(a: any, b: any): boolean {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

router.get("/ping", requireSession, (_req, res) => {
    const APP_VERSION = process.env.APP_VERSION ?? "dev";
    return res.json({ ok: true, version: `v${APP_VERSION}` });
});

router.post("/installed", requireSession, async (req, res) => {
    try {
        const email =
            (req as any).auth?.email ??
            String(req.header("x-auth-email") || "").toLowerCase();

        const count = await syncService.pushInstalled(req.body?.installed, email);
        return res.json({ ok: true, count });
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (/Body must be/.test(msg)) {
            log.warn("installed: invalid payload, expected { installed: string[] }");
            return res.status(400).json({ ok: false, error: "Body must be { installed: string[] }" });
        }
        log.warn("installed: failed", { err: msg });
        return res.status(400).json({ ok: false, error: msg });
    }
});

router.post("/snapshot", requireAdminSession, async (req, res) => {
    try {
        const email =
            (req as any).auth?.email ??
            String(req.header("x-auth-email") || "").toLowerCase();

        await syncService.pushSnapshot(req.body, email);
        return res.json({ ok: true });
    } catch (e: any) {
        log.warn("snapshot: failed", { err: String(e?.message || e) });
        return res.status(400).json({ ok: false, error: String(e?.message || e) });
    }
});

router.post("/delta", requireAdminSession, async (req, res) => {
    try {
        const body = (req.body ?? {}) as ClientManifest;
        const incoming = body.json ?? {};
        log.info(`incoming delta request for ${Object.keys(incoming).length} collections`);
        log.debug("delta request", { collections: Object.keys(incoming) });
        const toUpsert: DeltaManifest["toUpsert"] = {};
        const toDelete: DeltaManifest["toDelete"] = {};

        for (const key of Object.keys(incoming)) {
            const collection = sanitizeCollection(key);
            const idsFromClient = new Set((incoming[collection] ?? []).map(sanitizeId));

            const dir = join(DB_ROOT, collection);
            let serverIds: string[] = [];
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                serverIds = entries
                    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
                    .map((e) => e.name.replace(/\.json$/i, ""));
            } catch { /* dir may not exist yet */ }

            const serverSet = new Set(serverIds);

            const upserts: string[] = [];
            for (const id of idsFromClient) {
                log.debug(`checking upsert for id=${id}`);
                if (!serverSet.has(id)) upserts.push(id);
            }

            const deletes: string[] = [];
            for (const id of serverSet) {
                log.debug(`checking delete for id=${id}`);
                if (!idsFromClient.has(id)) deletes.push(id);
            }

            log.info(`delta for collection=${collection}: toUpsert=${upserts.length}, toDelete=${deletes.length}`);

            if (upserts.length) toUpsert[collection] = upserts;
            if (deletes.length) toDelete[collection] = deletes;
        }

        return res.json({ ok: true, delta: { toUpsert, toDelete } });
    } catch (e: any) {
        const msg = String(e?.message ?? e);
        log.warn("delta failed", { err: msg });
        return res.status(400).json({ ok: false, error: msg });
    }
});

router.put(
    "/media/*",
    requireAdminSession,
    // Parse raw binary for application/octet-stream (what the Playnite extension sends)
    express.raw({ type: "application/octet-stream", limit: "50mb" }),
    // Still support multipart/form-data via multer if we ever want it
    mediaUpload.any(),
    async (req, res) => {
        try {
            let buffer: Buffer | null = null;

            // 1) Raw octet-stream body from express.raw
            if (Buffer.isBuffer(req.body)) {
                buffer = req.body as Buffer;
            }
            // 2) Multipart/form-data handled by multer
            else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const f = req.files[0] as Express.Multer.File;
                buffer = f.buffer;
            }
            // 3) Fallbacks (string / JSON / base64)
            else if (req.body && typeof req.body === "string") {
                buffer = Buffer.from(req.body);
            } else if (req.body && typeof req.body === "object") {
                const b64 = (req.body as any).data;
                if (b64 && typeof b64 === "string") {
                    buffer = Buffer.from(b64, "base64");
                }
            }

            if (!buffer || !buffer.length) {
                return res.status(400).json({ ok: false, error: "empty body" });
            }

            const tail = req.params[0] ?? "";
            const abs = safeJoinMedia(MEDIA_ROOT, tail);

            const wantHash = String(req.header("x-hash") ?? "");
            const st = await fileStatOrNull(abs);

            if (st && st.size === buffer.length) {
                if (!wantHash) return res.status(204).end();
                const crypto = await import("node:crypto");
                const got = crypto.createHash("sha1")
                    .update(await fs.readFile(abs))
                    .digest("hex");
                if (got === wantHash) return res.status(204).end();
            }

            await ensureDir(dirname(abs));
            await fs.writeFile(abs, buffer);
            log.debug(`put media for ${tail}: ${buffer.length} bytes`);
            return res.status(st ? 200 : 201).json({ ok: true, bytes: buffer.length });
        } catch (e: any) {
            log.warn("put media failed", { err: String(e?.message ?? e) });
            return res.status(400).json({ ok: false, error: String(e?.message ?? e) });
        }
    }
);

router.get("/collection/:collection", requireSession, async (req, res) => {
    try {
        const collection = sanitizeCollection(req.params.collection);
        const dir = join(DB_ROOT, collection);

        let rows: any[] = [];

        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            const jsonFiles = entries
                .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"));

            const all = await Promise.all(
                jsonFiles.map(async (e) => {
                    const p = join(dir, e.name);
                    const json = await readJsonIfExists(p);
                    if (!json) return [];
                    // allow either [..] or {..} per file
                    return Array.isArray(json) ? json : [json];
                })
            );

            rows = all.flat();
        } catch (e: any) {
            // if the folder doesn't exist yet, just return empty
            if (e?.code === "ENOENT") {
                rows = [];
            } else {
                throw e;
            }
        }

        // deterministic sort – prefer Id, then Name, then JSON string
        rows.sort((a: any, b: any) => {
            const aId = (a && typeof a === "object" && "Id" in a) ? String(a.Id) : "";
            const bId = (b && typeof b === "object" && "Id" in b) ? String(b.Id) : "";
            if (aId || bId) return aId.localeCompare(bId);

            const aName = (a && typeof a === "object" && "Name" in a) ? String(a.Name) : "";
            const bName = (b && typeof b === "object" && "Name" in b) ? String(b.Name) : "";
            if (aName || bName) return aName.localeCompare(bName);

            return JSON.stringify(a).localeCompare(JSON.stringify(b));
        });

        return res.json(rows);
    } catch (e: any) {
        log.warn("collection list failed", { err: String(e?.message ?? e) });
        return res
            .status(400)
            .json({ ok: false, error: String(e?.message ?? e) });
    }
});

router.post("/:collection/:id", requireAdminSession, async (req, res) => {
    try {
        const collection = sanitizeCollection(req.params.collection);
        const id = sanitizeId(req.params.id);
        const p = resolveDocPath(collection, id);

        const existing = await readJsonIfExists(p);
        if (existing && sameJson(existing, req.body)) {
            return res.status(204).end(); // already identical
        }
        if (existing) {
            // POST should not overwrite; treat as idempotent no-op if identical, else conflict
            return res.status(409).json({ ok: false, error: "exists" });
        }

        await writeJson(p, req.body ?? {});
        return res.status(201).json({ ok: true, id, collection });
    } catch (e: any) {
        log.warn("post entity failed", { err: String(e?.message ?? e) });
        return res.status(400).json({ ok: false, error: String(e?.message ?? e) });
    }
});

router.put("/:collection/:id", requireAdminSession, async (req, res) => {
    try {
        const collection = sanitizeCollection(req.params.collection);
        const id = sanitizeId(req.params.id);
        const p = resolveDocPath(collection, id);

        const existing = await readJsonIfExists(p);
        if (existing && sameJson(existing, req.body)) {
            return res.status(204).end(); // no change
        }

        await writeJson(p, req.body ?? {});
        const created = !existing;
        return res.status(created ? 201 : 200).json({ ok: true, id, collection, created });
    } catch (e: any) {
        log.warn("put entity failed", String(e?.message ?? e));
        return res.status(400).json({ ok: false, error: String(e?.message ?? e) });
    }
});

router.delete("/:collection/:id", requireAdminSession, async (req, res) => {
    try {
        const collection = sanitizeCollection(req.params.collection);
        const id = sanitizeId(req.params.id);
        const p = resolveDocPath(collection, id);

        try {
            await fs.unlink(p);
            return res.status(204).end();
        } catch (e: any) {
            if (e?.code === "ENOENT") return res.status(204).end(); // idempotent delete
            throw e;
        }
    } catch (e: any) {
        log.warn("delete entity failed", { err: String(e?.message ?? e) });
        return res.status(400).json({ ok: false, error: String(e?.message ?? e) });
    }
});

export default router;