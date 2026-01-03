import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { rootLog } from "../logger";
import { AccountsService } from "./AccountsService";
import { PLEX_DB_ROOT, PLEX_MEDIA_ROOT, PLEX_SNAPSHOT_ROOT, SNAPSHOT_FILENAME } from "../constants";
import type { PlexConnection, PlexMediaKind, PlexSnapshot } from "../types/plex";

const log = rootLog.child("plexService");

const PLEX_TV = process.env.PLEX_TV_PATH || "https://plex.tv";
const PLEX_PRODUCT = process.env.PLEX_PRODUCT || "InterLinked";

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function normServerUrl(raw: string): string {
  const s = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(s)) throw new Error("invalid_server_url");
  return s;
}

function randomClientId(): string {
  return crypto.randomUUID();
}

async function fetchJsonOrText(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, init);
  const ct = (r.headers.get("content-type") ?? "").toLowerCase();
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`http_${r.status}:${t.slice(0, 500)}`);
  }
  if (ct.includes("application/json")) return await r.json();
  // Plex sometimes returns XML even when you ask for JSON; keep as text.
  const t = await r.text();
  return { _raw: t, _contentType: ct };
}

function plexHeaders(conn: PlexConnection): Record<string, string> {
  // Plex expects these headers for PIN flow; PMS calls accept token either header or query.
  return {
    "Accept": "application/json",
    "X-Plex-Product": PLEX_PRODUCT,
    "X-Plex-Client-Identifier": conn.clientIdentifier,
  };
}

async function writeJson(p: string, obj: any) {
  await ensureDir(dirname(p));
  await fs.writeFile(p, JSON.stringify(obj, null, 2), "utf8");
}

async function downloadBinary(url: string, init?: RequestInit): Promise<{ buf: Buffer; contentType: string }> {
  const r = await fetch(url, init);
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`http_${r.status}:${t.slice(0, 300)}`);
  }
  const ct = (r.headers.get("content-type") ?? "application/octet-stream").toLowerCase();
  const ab = await r.arrayBuffer();
  return { buf: Buffer.from(ab), contentType: ct };
}

function extFromContentType(ct: string): string {
  if (ct.includes("image/jpeg")) return "jpg";
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/webp")) return "webp";
  return "bin";
}

function makeEntityId(sectionKey: string, ratingKey: string) {
  return `${sectionKey}:${ratingKey}`;
}

function makeMediaId(sectionKey: string, ratingKey: string, kind: PlexMediaKind) {
  return `${sectionKey}:${ratingKey}:${kind}`;
}

// Extract trailing numeric version from e.g. "/library/metadata/58803/thumb/1766110770"
function parseMediaVersionFromPath(p: string | null | undefined): number | null {
  if (!p) return null;
  const m = String(p).match(/\/(\d+)(?:\/)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

// Determine which media URLs exist on an item and their versions.
// We prefer item.thumb/art fields for thumb/art.
// clearLogo often appears in Image[]; we’ll try both.
function collectMedia(item: any): Array<{ kind: PlexMediaKind; path: string; version: number }> {
  const out: Array<{ kind: PlexMediaKind; path: string; version: number }> = [];

  const thumb = item?.thumb ? String(item.thumb) : null;
  const art = item?.art ? String(item.art) : null;

  if (thumb?.startsWith("/")) {
    const v = parseMediaVersionFromPath(thumb);
    if (v != null) out.push({ kind: "thumb", path: thumb, version: v });
  }
  if (art?.startsWith("/")) {
    const v = parseMediaVersionFromPath(art);
    if (v != null) out.push({ kind: "art", path: art, version: v });
  }

  // clearLogo: check Image[] objects (if present)
  const images = item?.Image
    ? (Array.isArray(item.Image) ? item.Image : [item.Image])
    : [];
  for (const img of images) {
    const type = String(img?.type ?? "");
    const url = img?.url ? String(img.url) : null;
    if (type === "clearLogo" && url?.startsWith("/")) {
      const v = parseMediaVersionFromPath(url);
      if (v != null) out.push({ kind: "clearLogo", path: url, version: v });
    }
  }

  // de-dupe by kind (keep the last one if multiple)
  const byKind = new Map<PlexMediaKind, { kind: PlexMediaKind; path: string; version: number }>();
  for (const m of out) byKind.set(m.kind, m);
  return Array.from(byKind.values());
}

async function readSnapshot(p: string): Promise<PlexSnapshot | null> {
  try {
    const txt = await fs.readFile(p, "utf8");
    const obj = JSON.parse(txt);
    if (obj && typeof obj === "object" && obj.Source === "plex-sync" && obj.DbVersions && obj.MediaVersions) {
      return obj as PlexSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeJsonAtomic(p: string, obj: any) {
  await ensureDir(dirname(p));
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await fs.rename(tmp, p);
}

async function ensureCleanLayout() {
  // Optional: remove old v1 section files if you want a clean break on disk.
  // If you’d rather keep them around, delete this.
  try {
    const files = await fs.readdir(PLEX_DB_ROOT);
    for (const f of files) {
      if (f.startsWith("section-") && f.endsWith(".json")) {
        await fs.rm(join(PLEX_DB_ROOT, f), { force: true }).catch(() => { });
      }
      if (f === "sections.json") {
        await fs.rm(join(PLEX_DB_ROOT, f), { force: true }).catch(() => { });
      }
    }
  } catch { }
}

// In-memory collection cache (same pattern as Playnite)
const plexCollectionCache = new Map<string, { rows: any[]; snapshotMtimeMs: number | null }>();

async function getPlexSnapshotMtimeMs(): Promise<number | null> {
  const snapshotPath = join(PLEX_SNAPSHOT_ROOT, SNAPSHOT_FILENAME);
  try {
    const stat = await fs.stat(snapshotPath);
    return stat.mtimeMs;
  } catch (e: any) {
    if (e?.code === "ENOENT") return null;
    throw e;
  }
}

async function readPlexSnapshotOrNull(): Promise<PlexSnapshot | null> {
  const snapshotPath = join(PLEX_SNAPSHOT_ROOT, SNAPSHOT_FILENAME);
  try {
    const txt = await fs.readFile(snapshotPath, "utf8");
    return JSON.parse(txt) as PlexSnapshot;
  } catch (e: any) {
    if (e?.code === "ENOENT") return null;
    throw e;
  }
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

async function loadJsonRowsFromDir(dir: string, sectionKey?: string): Promise<any[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const jsonFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"));

  const all = await Promise.all(
    jsonFiles.map(async (e) => {
      const p = join(dir, e.name);
      const json = await readJsonIfExists(p);
      if (!json) return [];

      const rows = Array.isArray(json) ? json : [json];

      if (sectionKey) {
        for (const r of rows) {
          if (r && typeof r === "object") {
            r.librarySectionID ??= sectionKey;
            r.sectionKey ??= sectionKey;
          }
        }
      }

      return rows;
    })
  );

  return all.flat();
}


function normalizeCollectionName(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

function resolveSectionKeysForCollection(name: string, snap: PlexSnapshot | null): string[] {
  if (name === "items" || name === "all") return ["*"]; // special marker: all sections

  const sections = snap?.Sections ?? {};
  const entries = Object.entries(sections); // [sectionKey, {Title,Type,...}]

  const norm = (s: any) => String(s ?? "").trim().toLowerCase();

  // 1) Best: exact match on slugified title (so "Animated Movies" -> "animated-movies")
  const slug = (s: string) =>
    norm(s)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const bySlug = entries.filter(([_, sec]) => slug(sec?.Title ?? "") === name);
  if (bySlug.length) return bySlug.map(([k]) => k);

  // 2) Backwards compat / aliases
  const aliases: Record<string, string[]> = {
    movies: ["movies"],
    series: ["series", "tv", "shows"],
    tv: ["series", "tv", "shows"],
    shows: ["series", "tv", "shows"],
    "animated-movies": ["animated-movies"],
    "animated-series": ["animated-series"],
    audiobooks: ["audiobooks"],
    music: ["music"],
  };

  const wanted = new Set(aliases[name] ?? [name]);

  const matches = entries.filter(([_, sec]) => {
    const t = slug(sec?.Title ?? "");
    const type = norm(sec?.Type ?? "");

    // allow mapping by title slug first
    if (wanted.has(t)) return true;

    // fallback by type for old generic names
    if (name === "movies") return type === "movie";
    if (name === "series" || name === "tv" || name === "shows") return type === "show";
    if (name === "music") return type === "artist";

    return false;
  });

  return matches.map(([k]) => k);
}

export const PlexService = {
  /**
   * Start Plex PIN auth: returns authUrl + pinId.
   * Uses Plex official PIN flow.
   * @param email Admin account email
   * @param serverUrlRaw PMS base URL
   * @param forwardUrl URL to redirect after auth complete
   */
  async startAuth(email: string, serverUrlRaw: string, forwardUrl: string) {
    const serverUrl = normServerUrl(serverUrlRaw);

    const acc = await AccountsService.getAccount(email);
    if (!acc) throw new Error("not_found");
    const existing = acc.plex;

    const clientIdentifier = existing?.clientIdentifier ?? randomClientId();

    const conn: PlexConnection = {
      serverUrl,
      clientIdentifier,
      token: existing?.token ?? null,
      linkedAt: existing?.linkedAt ?? null,
      lastSyncedAt: existing?.lastSyncedAt ?? null,
      lastSyncOk: existing?.lastSyncOk ?? null,
      lastSyncError: existing?.lastSyncError ?? null,
      lastPinId: null,
      lastPinCode: null,
    };

    // Create PIN
    const pin = await fetchJsonOrText(`${PLEX_TV}/api/v2/pins`, {
      method: "POST",
      headers: {
        ...plexHeaders(conn),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ strong: "true" }).toString(),
    });

    const pinId = Number(pin?.id);
    const code = String(pin?.code ?? "");
    if (!pinId || !code) throw new Error("pin_create_failed");

    conn.lastPinId = pinId;
    conn.lastPinCode = code;

    await AccountsService.setPlexConnection(email, conn);

    // Auth URL format from Plex docs. :contentReference[oaicite:2]{index=2}
    const qs = new URLSearchParams();
    qs.set("clientID", clientIdentifier);
    qs.set("code", code);
    qs.set("forwardUrl", forwardUrl);
    // nested params: context[device][product]
    qs.set("context%5Bdevice%5D%5Bproduct%5D", PLEX_PRODUCT);

    const authUrl = `https://app.plex.tv/auth#?${qs.toString()}`;

    return { authUrl, pinId };
  },

  /**
   * Poll PIN until authToken appears, then store token on admin account.
   * @param email Admin account email
   * @param pinIdRaw Optional PIN ID to use (overrides stored)
   */
  async pollAuth(email: string, pinIdRaw?: number) {
    const acc = await AccountsService.getAccount(email);
    if (!acc?.plex) throw new Error("plex_not_configured");
    const conn = acc.plex;

    const pinId = Number(pinIdRaw ?? conn.lastPinId ?? 0);
    const code = String(conn.lastPinCode ?? "");
    if (!pinId || !code) throw new Error("missing_pin_state");

    const pin = await fetchJsonOrText(`${PLEX_TV}/api/v2/pins/${pinId}?${new URLSearchParams({ code }).toString()}`, {
      method: "GET",
      headers: plexHeaders(conn),
    });

    const token = pin?.authToken ? String(pin.authToken) : null;

    if (!token) {
      // not ready yet
      return { linked: false };
    }

    // Optional: verify token by calling /api/v2/user (Plex docs mention this). :contentReference[oaicite:3]{index=3}
    try {
      await fetchJsonOrText(`${PLEX_TV}/api/v2/user`, {
        method: "GET",
        headers: {
          ...plexHeaders(conn),
          "X-Plex-Token": token,
        },
      });
    } catch (e: any) {
      throw new Error(`token_invalid:${String(e?.message ?? e)}`);
    }

    const updated: PlexConnection = {
      ...conn,
      token,
      linkedAt: new Date().toISOString(),
    };

    await AccountsService.setPlexConnection(email, updated);

    return { linked: true };
  },

  /**
   * Unlink Plex from admin account (removes stored token).
   * @param email Admin account email
   */
  async unlink(email: string) {
    const acc = await AccountsService.getAccount(email);
    if (!acc) throw new Error("not_found");
    acc.plex = undefined;
    await AccountsService.setPlexConnection(email, undefined);
    return { ok: true };
  },

  /**
   * Get Plex connection status for admin account.
   * @param email Admin account email
   */
  async getStatus(email: string) {
    const acc = await AccountsService.getAccount(email);
    if (!acc?.plex) return { ok: true, connected: false };

    const { serverUrl, linkedAt, lastSyncedAt, lastSyncOk, lastSyncError } = acc.plex;
    const connected = !!acc.plex.token && !!linkedAt;

    return {
      ok: true,
      connected,
      serverUrl,
      linkedAt: linkedAt ?? null,
      lastSyncedAt: lastSyncedAt ?? null,
      lastSyncOk: lastSyncOk ?? null,
      lastSyncError: lastSyncError ?? null,
    };
  },

  /**
   * Sync Plex library: fetch metadata + media from PMS, store on disk.
   * @param email Admin account email
   */
  async sync(email: string) {
    const acc = await AccountsService.getAccount(email);
    if (!acc?.plex) throw new Error("plex_not_configured");
    const conn = acc.plex;
    if (!conn.token) throw new Error("plex_not_linked");

    const token = conn.token;
    const base = conn.serverUrl;

    log.info("plex sync: start", { base });

    await ensureDir(PLEX_DB_ROOT);
    await ensureDir(PLEX_MEDIA_ROOT);
    await ensureDir(PLEX_SNAPSHOT_ROOT);

    // Clean break on disk (optional but matches “non backward compat”)
    await ensureCleanLayout();

    const snapshotPath = join(PLEX_SNAPSHOT_ROOT, SNAPSHOT_FILENAME);
    const oldSnap = await readSnapshot(snapshotPath);

    // ---------- Phase A: Scan Plex -> build new snapshot + keep item payloads for upserts ----------
    const sectionsResp = await fetchJsonOrText(`${base}/library/sections`, {
      headers: { ...plexHeaders(conn), "X-Plex-Token": token },
    });

    const dirs: any[] =
      sectionsResp?.MediaContainer?.Directory
        ? (Array.isArray(sectionsResp.MediaContainer.Directory)
          ? sectionsResp.MediaContainer.Directory
          : [sectionsResp.MediaContainer.Directory])
        : [];

    const newDbVersions: Record<string, number> = {};
    const newMediaVersions: Record<string, number> = {};
    const sectionsMeta: PlexSnapshot["Sections"] = {};

    // Cache only what we need to write for db upserts (avoid holding everything)
    // map entityId -> item JSON (only for things that changed; decided later)
    const scannedItems = new Map<string, any>();

    for (const d of dirs) {
      const sectionKey = String(d?.key ?? "");
      const title = String(d?.title ?? d?.name ?? sectionKey);
      const type = d?.type ? String(d.type) : null;
      if (!sectionKey) continue;

      log.info(`plex scan: section ${title} (${sectionKey})`);

      let sectionCount = 0;
      let sectionTick = 0;

      let start = 0;
      const pageSize = 200;

      while (true) {
        const url =
          `${base}/library/sections/${encodeURIComponent(sectionKey)}/all?` +
          new URLSearchParams({
            "X-Plex-Container-Start": String(start),
            "X-Plex-Container-Size": String(pageSize),
          }).toString();

        const page = await fetchJsonOrText(url, {
          headers: { ...plexHeaders(conn), "X-Plex-Token": token },
        });

        const mc = page?.MediaContainer ?? {};
        const meta = mc?.Metadata ? (Array.isArray(mc.Metadata) ? mc.Metadata : [mc.Metadata]) : [];

        for (const item of meta) {
          const ratingKey = String(item?.ratingKey ?? "");
          if (!ratingKey) continue;

          sectionCount++;

          const entityId = makeEntityId(sectionKey, ratingKey);
          const dbVersion = Number(item?.updatedAt ?? 0) || 0;
          newDbVersions[entityId] = dbVersion;
          if (dbVersion > sectionTick) sectionTick = dbVersion;

          // Media versions
          for (const m of collectMedia(item)) {
            newMediaVersions[makeMediaId(sectionKey, ratingKey, m.kind)] = m.version;
          }

          // Store the raw item so we can write it later if it turns out to be an upsert
          scannedItems.set(entityId, item);
        }

        const totalSize = Number(mc?.totalSize ?? meta.length);
        start += meta.length;
        if (!meta.length || start >= totalSize) break;
      }

      sectionsMeta[sectionKey] = { Title: title, Type: type, DbTicks: sectionTick, ItemCount: sectionCount };
    }

    const dbTick = Object.values(newDbVersions).reduce((m, v) => (v > m ? v : m), 0);

    const newSnap: PlexSnapshot = {
      UpdatedAt: new Date().toISOString(),
      Source: "plex-sync",
      ServerUrl: base,
      DbTicks: dbTick,
      Sections: sectionsMeta,
      DbVersions: newDbVersions,
      MediaVersions: newMediaVersions,
    };

    // ---------- Phase B: Delta old vs new (server pull-delta) ----------
    const oldDb = oldSnap?.DbVersions ?? {};
    const oldMedia = oldSnap?.MediaVersions ?? {};

    const dbUpserts: string[] = [];
    const dbDeletes: string[] = [];

    for (const [id, v] of Object.entries(newDbVersions)) {
      if (oldDb[id] !== v) dbUpserts.push(id);
    }
    for (const id of Object.keys(oldDb)) {
      if (!(id in newDbVersions)) dbDeletes.push(id);
    }

    const mediaDownloads: Array<{ sectionKey: string; ratingKey: string; kind: PlexMediaKind; path: string }> = [];
    const mediaDeletes: Array<{ sectionKey: string; ratingKey: string; kind: PlexMediaKind }> = [];

    // For downloads, we need the URL path. We can re-derive it from scanned item.
    // (We stored scannedItems for all IDs)
    const wantMediaKey = (k: string) => (oldMedia[k] !== newMediaVersions[k]);

    for (const [mediaId, version] of Object.entries(newMediaVersions)) {
      if (!wantMediaKey(mediaId)) continue;

      const [sectionKey, ratingKey, kindRaw] = mediaId.split(":");
      const kind = kindRaw as PlexMediaKind;

      const entityId = makeEntityId(sectionKey, ratingKey);
      const item = scannedItems.get(entityId);
      if (!item) continue;

      const media = collectMedia(item).find((m) => m.kind === kind);
      if (!media) continue;

      mediaDownloads.push({ sectionKey, ratingKey, kind, path: media.path });
    }

    for (const mediaId of Object.keys(oldMedia)) {
      if (!(mediaId in newMediaVersions)) {
        const [sectionKey, ratingKey, kindRaw] = mediaId.split(":");
        mediaDeletes.push({ sectionKey, ratingKey, kind: kindRaw as PlexMediaKind });
      }
    }

    log.info("plex sync: delta", {
      dbUpserts: dbUpserts.length,
      dbDeletes: dbDeletes.length,
      mediaDownloads: mediaDownloads.length,
      mediaDeletes: mediaDeletes.length,
    });

    // ---------- Phase C: Apply delta (write per-entity + download media) ----------
    // DB upserts
    for (const entityId of dbUpserts) {
      const [sectionKey, ratingKey] = entityId.split(":");
      const item = scannedItems.get(entityId);
      if (!item) continue;

      const outPath = join(PLEX_DB_ROOT, sectionKey, `${ratingKey}.json`);
      await writeJson(outPath, item);
    }

    // DB deletes (and media folder cleanup)
    for (const entityId of dbDeletes) {
      const [sectionKey, ratingKey] = entityId.split(":");
      const p = join(PLEX_DB_ROOT, sectionKey, `${ratingKey}.json`);
      await fs.rm(p, { force: true }).catch(() => { });
      const mdir = join(PLEX_MEDIA_ROOT, sectionKey, ratingKey);
      await fs.rm(mdir, { recursive: true, force: true }).catch(() => { });
    }

    // Media deletes (if a kind disappears but entity stays)
    // If you store fixed filenames (thumb.jpg/art.jpg/...), delete any matching prefix.
    for (const md of mediaDeletes) {
      const dir = join(PLEX_MEDIA_ROOT, md.sectionKey, md.ratingKey);
      try {
        const files = await fs.readdir(dir);
        for (const f of files) {
          if (f.startsWith(`${md.kind}.`)) {
            await fs.rm(join(dir, f), { force: true }).catch(() => { });
          }
        }
      } catch { }
    }

    // Media downloads (write kind.ext; remove previous kind.* first)
    let totalDownloads = 0;

    for (const t of mediaDownloads) {
      const fileUrl = `${base}${t.path}`;
      try {
        const { buf, contentType } = await downloadBinary(fileUrl, {
          headers: { ...plexHeaders(conn), "X-Plex-Token": token },
        });

        const ext = extFromContentType(contentType);
        const outDir = join(PLEX_MEDIA_ROOT, t.sectionKey, t.ratingKey);
        await ensureDir(outDir);

        // delete previous kind.* to avoid stale ext switching
        try {
          const files = await fs.readdir(outDir);
          for (const f of files) {
            if (f.startsWith(`${t.kind}.`)) await fs.rm(join(outDir, f), { force: true }).catch(() => { });
          }
        } catch { }

        const outPath = join(outDir, `${t.kind}.${ext}`);
        await fs.writeFile(outPath, buf);
        totalDownloads++;
      } catch (e: any) {
        log.warn("plex media download failed", {
          sectionKey: t.sectionKey,
          ratingKey: t.ratingKey,
          kind: t.kind,
          err: String(e?.message ?? e),
        });
      }
    }

    // ---------- Phase D: write snapshot (atomic) ----------
    await writeJsonAtomic(snapshotPath, newSnap);

    // update account audit
    const updated: PlexConnection = {
      ...conn,
      lastSyncedAt: newSnap.UpdatedAt,
      lastSyncOk: true,
      lastSyncError: null,
    };
    await AccountsService.setPlexConnection(email, updated);

    log.info("plex sync: done", {
      dbTick: newSnap.DbTicks,
      dbUpserts: dbUpserts.length,
      dbDeletes: dbDeletes.length,
      mediaDownloads: totalDownloads,
    });

    return {
      ok: true,
      ...newSnap,
      applied: {
        dbUpserts: dbUpserts.length,
        dbDeletes: dbDeletes.length,
        mediaDownloads: totalDownloads,
      },
    };
  },

  /**
   * List items in a Plex collection (semantic name).
   * @param collectionRaw Collection name (e.g. "movies", "series", "all", or custom)
   */
  async listCollection(collectionRaw: string): Promise<any[]> {
    const collection = normalizeCollectionName(collectionRaw);
    if (!collection) throw new Error("missing_collection");

    const currentSnapshotMtime = await getPlexSnapshotMtimeMs();
    const cached = plexCollectionCache.get(collection);

    // If we have cache AND snapshot mtime matches → return cache
    if (cached && cached.snapshotMtimeMs === currentSnapshotMtime) {
      return cached.rows;
    }

    const snap = await readPlexSnapshotOrNull();
    const keys = resolveSectionKeysForCollection(collection, snap);

    if (keys.length === 0) {
      throw new Error(`unknown_collection:${collection}`);
    }

    // Helper: stamp section onto rows (without overwriting if already present)
    const stampSection = (rows: any[], sectionKey: string) => {
      for (const r of rows) {
        if (r && typeof r === "object") {
          r.librarySectionID ??= sectionKey; // what your web app expects
          r.sectionKey ??= sectionKey;       // optional explicit field
        }
      }
      return rows;
    };

    let rows: any[] = [];

    // "items" / "all" => load all section folders under PLEX_DB_ROOT
    if (keys.length === 1 && keys[0] === "*") {
      let dirs: string[] = [];
      try {
        const entries = await fs.readdir(PLEX_DB_ROOT, { withFileTypes: true });
        dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      } catch (e: any) {
        if (e?.code !== "ENOENT") throw e;
      }

      const all = await Promise.all(
        dirs.map(async (sectionKey) => {
          const r = await loadJsonRowsFromDir(join(PLEX_DB_ROOT, sectionKey));
          return stampSection(r, sectionKey);
        })
      );

      rows = all.flat();
    } else {
      // specific semantic collections => load only those section folders
      const all = await Promise.all(
        keys.map(async (sectionKey) => {
          const r = await loadJsonRowsFromDir(join(PLEX_DB_ROOT, sectionKey));
          return stampSection(r, sectionKey);
        })
      );

      rows = all.flat();
    }

    // Deterministic ordering (optional, but helpful)
    rows.sort((a, b) => Number(a?.ratingKey ?? 0) - Number(b?.ratingKey ?? 0));

    plexCollectionCache.set(collection, { rows, snapshotMtimeMs: currentSnapshotMtime });
    return rows;
  },
};
