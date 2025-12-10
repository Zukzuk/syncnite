import { promises as fs } from "node:fs";
import { join, dirname, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { rootLog } from "../logger";
import {
    DATA_DIR,
    INSTALLED_ROOT,
    DB_ROOT,
    MEDIA_ROOT,
    COLLECTIONS,
} from "../constants";
import { PlayniteClientManifest, PlayniteDeltaManifest, PlayniteError } from "../types/types";

const log = rootLog.child("playniteService");

// Ensure directory exists
async function ensureDir(p: string) {
    await fs.mkdir(p, { recursive: true });
}

// Sanitize ID
function sanitizeId(id: string): string {
    const trimmed = String(id ?? "").trim();
    if (!trimmed) throw new PlayniteError(400, "missing_id", "missing id");
    const safe = trimmed.replace(/[^A-Za-z0-9_\-.]/g, "");
    if (!safe) throw new PlayniteError(400, "invalid_id", "invalid id");
    return safe;
}

// Sanitize collection
function sanitizeCollection(col: string): string {
    const c = String(col ?? "").trim().toLowerCase();
    if (!COLLECTIONS.has(c)) {
        throw new PlayniteError(
            400,
            "unknown_collection",
            `unknown collection: ${c}`
        );
    }
    return c;
}

// Resolve document path
function resolveDocPath(collection: string, id: string) {
    return join(DB_ROOT, collection, `${id}.json`);
}

// Read JSON file if exists
async function readJsonIfExists(p: string): Promise<any | null> {
    try {
        const buf = await fs.readFile(p, "utf8");
        return JSON.parse(buf);
    } catch (e: any) {
        if (e?.code === "ENOENT") return null;
        throw e;
    }
}

// Write JSON file
async function writeJson(p: string, obj: any) {
    await ensureDir(dirname(p));
    const data = JSON.stringify(obj, null, 2);
    await fs.writeFile(p, data, "utf8");
}

// Safely join media path
function safeJoinMedia(root: string, urlTail: string) {
    const rel = urlTail.replace(/^\/+/, "");
    const abs = resolve(root, rel);
    if (!abs.startsWith(resolve(root) + sep)) {
        throw new PlayniteError(400, "invalid_media_path", "invalid media path");
    }
    return abs;
}

// Get file stat or null
async function fileStatOrNull(p: string) {
    try {
        return await fs.stat(p);
    } catch {
        return null;
    }
}

// Compare two objects via JSON.stringify
function sameJson(a: any, b: any): boolean {
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch {
        return false;
    }
}

// In-memory collection cache
const collectionCache = new Map<string, any[]>();

// Playnite service class
export class PlayniteService {
    /**
     * Pushes a snapshot object to the server.
     * @param snapshot Snapshot object
     * @param email User email
     */
    async pushSnapshot(snapshot: unknown, email: string): Promise<void> {
        if (!snapshot || typeof snapshot !== "object") {
            log.warn("Invalid snapshot payload, expected snapshot object");
            throw new PlayniteError(
                400,
                "invalid_snapshot",
                "Body must be a snapshot object"
            );
        }
        if (!email) {
            throw new PlayniteError(400, "missing_email", "missing email");
        }

        const safeEmail =
            email.trim().toLowerCase().replace(/[\\/:*?"<>|]/g, "_") || "unknown";
        const now = new Date().toISOString();
        const s: any = snapshot;

        const updatedAt: string =
            typeof s?.updatedAt === "string"
                ? s.updatedAt
                : typeof s?.UpdatedAt === "string"
                    ? s.UpdatedAt
                    : now;

        const outDir = join(DATA_DIR, "snapshot");
        await ensureDir(outDir);
        const outPath = join(outDir, "snapshot.json");

        const out = {
            ...s,
            updatedAt,
            source: s?.source ?? "playnite-extension",
            pushedBy: safeEmail,
            serverUpdatedAt: now,
        };

        log.info("Writing snapshot.json", { outPath, updatedAt });
        await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");
    }

    /**
     * Pushes installed game IDs to the server.
     * @param installed Installed game IDs
     * @param email User email
     */
    async pushInstalled(installed: unknown, email: string): Promise<number> {
        if (!Array.isArray(installed)) {
            log.warn("Invalid payload, expected { installed: string[] }");
            throw new PlayniteError(
                400,
                "invalid_installed_payload",
                "Body must be { installed: string[] }"
            );
        }
        if (!email) {
            throw new PlayniteError(400, "missing_email", "missing email");
        }

        log.info(`Received ${installed.length} installed entries`);

        const uniq = Array.from(new Set(installed.map((s: any) => String(s))));
        log.info(`Normalized and deduped → ${uniq.length} unique entries`);

        const out = {
            installed: uniq,
            updatedAt: new Date().toISOString(),
            source: "playnite-extension",
        };

        const safeEmail = email
            .trim()
            .toLowerCase()
            .replace(/[\\/:*?"<>|]/g, "_");
        await ensureDir(INSTALLED_ROOT);
        const outPath = join(INSTALLED_ROOT, `${safeEmail}.installed.json`);

        log.debug(`Writing Installed list to ${outPath}`);
        await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");

        log.info(`Installed list written`, { outPath, count: uniq.length });
        return uniq.length;
    }

    /**
     * Computes delta between client and server manifests.
     * @param body Client manifest
     * @return Delta manifest
     */
    async computeDelta(body: PlayniteClientManifest): Promise<PlayniteDeltaManifest> {
        const incoming = body.json ?? {};
        const versions = body.versions ?? {};

        log.info(
            `incoming delta request for ${Object.keys(incoming).length} collections`
        );
        log.debug("delta request", { collections: Object.keys(incoming) });

        const toUpsert: PlayniteDeltaManifest["toUpsert"] = {};
        const toDelete: PlayniteDeltaManifest["toDelete"] = {};

        for (const key of Object.keys(incoming)) {
            const collection = sanitizeCollection(key);
            const idsFromClient = new Set(
                (incoming[collection] ?? []).map(sanitizeId)
            );

            const dir = join(DB_ROOT, collection);
            let serverIds: string[] = [];
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                serverIds = entries
                    .filter(
                        (e) =>
                            e.isFile() &&
                            e.name.toLowerCase().endsWith(".json")
                    )
                    .map((e) => e.name.replace(/\.json$/i, ""));
            } catch {
                // dir may not exist yet
            }

            const serverSet = new Set(serverIds);
            const versionsForCollection = versions[collection] ?? {};

            const upserts: string[] = [];

            for (const id of idsFromClient) {
                log.debug(`checking upsert for collection=${collection} id=${id}`);

                let needsUpsert = false;

                if (!serverSet.has(id)) {
                    needsUpsert = true;
                } else {
                    const clientVer = versionsForCollection[id];

                    if (typeof clientVer === "string" && clientVer.length > 0) {
                        try {
                            const p = resolveDocPath(collection, id);
                            const existing = await readJsonIfExists(p);
                            const serverVer =
                                existing &&
                                    typeof existing.MetadataVersion === "string"
                                    ? existing.MetadataVersion
                                    : undefined;

                            if (!serverVer || serverVer !== clientVer) {
                                needsUpsert = true;
                            }
                        } catch (e: any) {
                            log.warn("delta: version compare failed", {
                                collection,
                                id,
                                err: String(e?.message ?? e),
                            });
                            // stay conservative: don't upsert on error
                        }
                    }
                }

                if (needsUpsert) upserts.push(id);
            }

            const deletes: string[] = [];
            for (const id of serverSet) {
                log.debug(`checking delete for id=${id}`);
                if (!idsFromClient.has(id)) deletes.push(id);
            }

            log.info(
                `delta for collection=${collection}: toUpsert=${upserts.length}, toDelete=${deletes.length}`
            );

            if (upserts.length) toUpsert[collection] = upserts;
            if (deletes.length) toDelete[collection] = deletes;
        }

        return { toUpsert, toDelete };
    }

    /**
     * Save / update media file.
     * @param tail Media path tail
     * @param buffer Media data
     * @param wantHash Optional SHA1 hash to check against existing
     */
    async putMedia(
        tail: string,
        buffer: Buffer,
        wantHash?: string
    ): Promise<{ status: number; bytes?: number }> {
        const abs = safeJoinMedia(MEDIA_ROOT, tail);
        const st = await fileStatOrNull(abs);

        if (st && st.size === buffer.length) {
            if (!wantHash) {
                return { status: 204 };
            }
            const existing = await fs.readFile(abs);
            const got = createHash("sha1").update(existing).digest("hex");
            if (got === wantHash) {
                return { status: 204 };
            }
        }

        await ensureDir(dirname(abs));
        await fs.writeFile(abs, buffer);
        log.debug(`put media for ${tail}: ${buffer.length} bytes`);

        return { status: st ? 200 : 201, bytes: buffer.length };
    }

    /**
     * Resolve a media path and check it exists.
     * @param tail Media path tail
     */
    async getMediaPath(tail: string): Promise<string> {
        const abs = safeJoinMedia(MEDIA_ROOT, tail);
        const st = await fileStatOrNull(abs);
        if (!st || !st.isFile()) {
            throw new PlayniteError(404, "not_found", "not_found");
        }
        return abs;
    }

    /**
     * Return all entities in a collection (flattened).
     * @param collectionRaw Collection name
     */
    async listCollection(collectionRaw: string): Promise<any[]> {
        if (collectionCache.has(collectionRaw)) {
            return collectionCache.get(collectionRaw)!;
        }

        const collection = sanitizeCollection(collectionRaw);
        const dir = join(DB_ROOT, collection);

        let rows: any[] = [];

        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            const jsonFiles = entries.filter(
                (e) =>
                    e.isFile() &&
                    e.name.toLowerCase().endsWith(".json")
            );

            const all = await Promise.all(
                jsonFiles.map(async (e) => {
                    const p = join(dir, e.name);
                    const json = await readJsonIfExists(p);
                    if (!json) return [];
                    return Array.isArray(json) ? json : [json];
                })
            );

            rows = all.flat();
        } catch (e: any) {
            if (e?.code === "ENOENT") {
                rows = [];
            } else {
                throw e;
            }
        }

        collectionCache.set(collectionRaw, rows);

        return rows;
    }

    /**
     * Create/update entity, with status decision.
     * @param collectionRaw Collection name
     * @param idRaw Entity ID
     * @param data Entity data
     */
    async upsertEntity(
        collectionRaw: string,
        idRaw: string,
        data: any
    ): Promise<{ status: number; body?: any }> {
        const collection = sanitizeCollection(collectionRaw);
        const id = sanitizeId(idRaw);
        const p = resolveDocPath(collection, id);

        const existing = await readJsonIfExists(p);
        if (existing && sameJson(existing, data)) {
            return { status: 204 };
        }

        await writeJson(p, data ?? {});
        const created = !existing;

        return {
            status: created ? 201 : 200,
            body: { ok: true, id, collection, created },
        };
    }

    /**
     * Delete entity (idempotent).
     * @param collectionRaw Collection name
     * @param idRaw Entity ID
     */
    async deleteEntity(
        collectionRaw: string,
        idRaw: string
    ): Promise<{ status: number }> {
        const collection = sanitizeCollection(collectionRaw);
        const id = sanitizeId(idRaw);
        const p = resolveDocPath(collection, id);

        try {
            await fs.unlink(p);
            return { status: 204 };
        } catch (e: any) {
            if (e?.code === "ENOENT") {
                return { status: 204 };
            }
            log.warn("delete entity failed", { err: String(e?.message ?? e) });
            throw new PlayniteError(400, "delete_failed", String(e?.message ?? e));
        }
    }
}
