import { promises as fs } from "node:fs";
import { join, dirname, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { rootLog } from "../logger";
import { PLAYNITE_DB_ROOT, PLAYNITE_INSTALLED_ROOT, PLAYNITE_MEDIA_ROOT, PLAYNITE_SNAPSHOT_ROOT, PLAYNITE_COLLECTIONS, INSTALLED_SUFFIX, SNAPSHOT_FILENAME } from "../constants";
import { InstalledStateRow, PlayniteClientManifest, PlayniteDeltaManifest, PlayniteError } from "../types/playnite";

const log = rootLog.child("playniteService");

// Ensure directory exists
async function ensureDir(p: string) {
    await fs.mkdir(p, { recursive: true });
}

function validateToken(
  raw: string,
  errCodeMissing: string,
  errCodeInvalid: string,
  errMsg: string
): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new PlayniteError(400, errCodeMissing, errMsg);

  // Top-level token only (no separators / traversal)
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
    throw new PlayniteError(400, errCodeInvalid, errMsg);
  }

  // Allowed charset (same as before, but VALIDATE not mutate)
  if (!/^[A-Za-z0-9_.-]+$/.test(trimmed)) {
    throw new PlayniteError(400, errCodeInvalid, errMsg);
  }

  return trimmed;
}

// Sanitize ID
function sanitizeId(id: string): string {
  return validateToken(id, "missing_id", "invalid_id", "invalid id");
}

// Sanitize media folder name
function sanitizeMediaFolderName(name: string): string {
  return validateToken(name, "invalid_media_folder", "invalid_media_folder", "invalid media folder");
}

// Sanitize collection
function sanitizeCollection(col: string): string {
    const c = String(col ?? "").trim().toLowerCase();
    if (!PLAYNITE_COLLECTIONS.has(c)) {
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
    return join(PLAYNITE_DB_ROOT, collection, `${id}.json`);
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
const collectionCache = new Map<
    string,
    { rows: any[]; snapshotMtimeMs: number | null }
>();

// Get snapshot.json mtimeMs
async function getSnapshotMtimeMs(): Promise<number | null> {
    const snapshotPath = join(PLAYNITE_SNAPSHOT_ROOT, SNAPSHOT_FILENAME);

    try {
        const stat = await fs.stat(snapshotPath);
        return stat.mtimeMs;
    } catch (e: any) {
        if (e?.code === "ENOENT") {
            // No snapshot.json → treat as null; we'll still cache under "null"
            return null;
        }
        throw e;
    }
}

// Load collection from disk
async function loadCollectionFromDisk(
    collectionRaw: string,
    snapshotMtimeMs: number | null
): Promise<any[]> {
    let rows: any[] = [];

    try {
        const collection = sanitizeCollection(collectionRaw);
        const dir = join(PLAYNITE_DB_ROOT, collection);
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

    collectionCache.set(collectionRaw, { rows, snapshotMtimeMs });
    return rows;
}

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

        await ensureDir(PLAYNITE_SNAPSHOT_ROOT);
        const outPath = join(PLAYNITE_SNAPSHOT_ROOT, SNAPSHOT_FILENAME);

        const out = {
            ...s,
            Source: s?.source ?? "playnite-extension",
            PushedBy: safeEmail,
            ServerUpdatedAt: now,
        };

        log.info("Writing snapshot.json", { outPath, updatedAt: s.updatedAt });
        await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");
    }

    /**
     * Pushes installed game IDs to the server.
     * Expects InstalledStateRow[]:
     *   { id, isInstalled, installDirectory?, installSize? }
     *
     * Writes JSON:
     *   { installed: string[], updatedAt, source }
     */
    async pushInstalled(installed: InstalledStateRow[], email: string): Promise<number> {
        if (!Array.isArray(installed)) {
            log.warn("Invalid payload, expected InstalledStateRow[]");
            throw new PlayniteError(
                400,
                "invalid_installed_payload",
                "Body must be { installed: InstalledStateRow[] }"
            );
        }
        if (!email) {
            throw new PlayniteError(400, "missing_email", "missing email");
        }

        log.info(`Received installed push with ${installed.length} rows`);

        // Strict normalization: only object rows, only isInstalled === true
        const ids = installed
            .map((x: any): string | null => {
                const isInstalled = Boolean(x.IsInstalled);
                log.info(`Found installed id=${x.Id}`);
                return isInstalled ? x.Id : null;
            })
            .filter((x: string | null): x is string => !!x);

        const uniq = Array.from(new Set(ids));

        const out = {
            installed: uniq,
            updatedAt: new Date().toISOString(),
            source: "playnite-extension",
        };

        const safeEmail = email
            .trim()
            .toLowerCase()
            .replace(/[\\/:*?"<>|]/g, "_");

        await ensureDir(PLAYNITE_INSTALLED_ROOT);
        const outPath = join(PLAYNITE_INSTALLED_ROOT, `${safeEmail}${INSTALLED_SUFFIX}`);

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
        const mediaFolders = body.mediaFolders ?? {}; // NEW

        log.info(`incoming delta request for ${Object.keys(incoming).length} collections`);
        log.debug("delta request", { collections: Object.keys(incoming) });

        const toUpsert: PlayniteDeltaManifest["toUpsert"] = {};
        const toDelete: PlayniteDeltaManifest["toDelete"] = {};

        for (const key of Object.keys(incoming)) {
            const collection = sanitizeCollection(key);
            const idsFromClient = new Set((incoming[collection] ?? []).map(sanitizeId));

            const dir = join(PLAYNITE_DB_ROOT, collection);
            let serverIds: string[] = [];
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                serverIds = entries
                    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
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
                                existing && typeof existing.MetadataVersion === "string"
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

        // media folder repair detection
        const uploadFolders: string[] = [];
        for (const rawFolder of Object.keys(mediaFolders)) {
            let folder: string;
            try {
                folder = sanitizeMediaFolderName(rawFolder);
            } catch {
                // skip invalid folder names instead of failing the whole delta
                continue;
            }

            // folder is top-level under MEDIA_ROOT
            const abs = safeJoinMedia(PLAYNITE_MEDIA_ROOT, folder);
            const st = await fileStatOrNull(abs);
            if (!st || !st.isDirectory()) {
                uploadFolders.push(folder);
            }
        }

        if (uploadFolders.length) {
            log.info(`delta media repair: uploadFolders=${uploadFolders.length}`);
        }

        return {
            toUpsert,
            toDelete,
            media: { uploadFolders },
        };
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
        const abs = safeJoinMedia(PLAYNITE_MEDIA_ROOT, tail);
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
        const abs = safeJoinMedia(PLAYNITE_MEDIA_ROOT, tail);
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
        const currentSnapshotMtime = await getSnapshotMtimeMs();
        const cached = collectionCache.get(collectionRaw);

        // If we have cache AND snapshot mtime matches → return cache
        if (cached && cached.snapshotMtimeMs === currentSnapshotMtime) {
            return cached.rows;
        }
        // Else load from disk
        return loadCollectionFromDisk(collectionRaw, currentSnapshotMtime);
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
