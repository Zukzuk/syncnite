import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { rootLog } from "../logger";
import { AccountsService } from "./AccountsService";
import { PLEX_DB_ROOT, PLEX_MEDIA_ROOT, PLEX_SNAPSHOT_ROOT } from "../constants";
import type { PlexConnection } from "../types/plex";

const log = rootLog.child("plexService");

const PLEX_TV = "https://plex.tv";
const PLEX_PRODUCT = "InterLinked";
const PIN_TTL_MS = 10 * 60 * 1000;

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

export const PlexService = {
  /**
   * Start Plex PIN auth: returns authUrl + pinId.
   * Uses Plex official PIN flow. :contentReference[oaicite:1]{index=1}
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

  async unlink(email: string) {
    const acc = await AccountsService.getAccount(email);
    if (!acc) throw new Error("not_found");
    acc.plex = undefined;
    await AccountsService.setPlexConnection(email, undefined);
    return { ok: true };
  },

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
   * Sync Plex libraries to JSON + download thumb/art to libraryfiles.
   * Library sections endpoint is documented by Plex support. :contentReference[oaicite:4]{index=4}
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

    // 1) Libraries (sections)
    const sections = await fetchJsonOrText(`${base}/library/sections`, {
      headers: {
        ...plexHeaders(conn),
        "X-Plex-Token": token,
      },
    });

    await writeJson(join(PLEX_DB_ROOT, "sections.json"), sections);

    const dirs: any[] =
      sections?.MediaContainer?.Directory
        ? (Array.isArray(sections.MediaContainer.Directory) ? sections.MediaContainer.Directory : [sections.MediaContainer.Directory])
        : [];

    let totalItems = 0;
    let totalDownloads = 0;

    // 2) For each section: fetch all items (paged)
    for (const d of dirs) {
      const key = String(d?.key ?? "");
      const title = String(d?.title ?? d?.name ?? key);
      if (!key) continue;

      log.info(`plex sync: section ${title} (${key})`);

      const all: any[] = [];
      let start = 0;
      const pageSize = 200;

      while (true) {
        const url =
          `${base}/library/sections/${encodeURIComponent(key)}/all?` +
          new URLSearchParams({
            "X-Plex-Container-Start": String(start),
            "X-Plex-Container-Size": String(pageSize),
          }).toString();

        const page = await fetchJsonOrText(url, {
          headers: {
            ...plexHeaders(conn),
            "X-Plex-Token": token,
          },
        });

        const mc = page?.MediaContainer ?? {};
        const meta = mc?.Metadata
          ? (Array.isArray(mc.Metadata) ? mc.Metadata : [mc.Metadata])
          : [];

        all.push(...meta);

        const totalSize = Number(mc?.totalSize ?? meta.length);
        start += meta.length;

        if (!meta.length || start >= totalSize) break;
      }

      totalItems += all.length;

      // store db json for this section
      await writeJson(join(PLEX_DB_ROOT, `section-${key}.json`), {
        section: { key, title, type: d?.type ?? null },
        count: all.length,
        items: all,
      });

      // 3) Download libraryfiles (thumb + art where present)
      for (const item of all) {
        const ratingKey = String(item?.ratingKey ?? "");
        if (!ratingKey) continue;

        // Plex commonly returns relative paths like "/library/metadata/<id>/thumb"
        const thumb = item?.thumb ? String(item.thumb) : null;
        const art = item?.art ? String(item.art) : null;

        const targets: Array<{ kind: "thumb" | "art"; path: string }> = [];
        if (thumb && thumb.startsWith("/")) targets.push({ kind: "thumb", path: thumb });
        if (art && art.startsWith("/")) targets.push({ kind: "art", path: art });

        for (const t of targets) {
          const fileUrl = `${base}${t.path}`; // token via header
          try {
            const { buf, contentType } = await downloadBinary(fileUrl, {
              headers: {
                ...plexHeaders(conn),
                "X-Plex-Token": token,
              },
            });

            const ext = extFromContentType(contentType);
            const outDir = join(PLEX_MEDIA_ROOT, `section-${key}`, ratingKey);
            await ensureDir(outDir);
            const outPath = join(outDir, `${t.kind}.${ext}`);

            await fs.writeFile(outPath, buf);
            totalDownloads++;
          } catch (e: any) {
            // non-fatal
            log.warn("plex download failed", { key, ratingKey, kind: t.kind, err: String(e?.message ?? e) });
          }
        }
      }
    }

    const snapshot = {
      updatedAt: new Date().toISOString(),
      source: "plex-sync",
      serverUrl: conn.serverUrl,
      sectionCount: dirs.length,
      totalItems,
      totalDownloads,
    };

    await writeJson(join(PLEX_SNAPSHOT_ROOT, "snapshot.json"), snapshot);

    // update account audit
    const updated: PlexConnection = {
      ...conn,
      lastSyncedAt: snapshot.updatedAt,
      lastSyncOk: true,
      lastSyncError: null,
    };
    await AccountsService.setPlexConnection(email, updated);

    log.info("plex sync: done", snapshot);

    return { ok: true, ...snapshot };
  },
};
