import { FILES } from "./constants";
import type { GameDoc, Loaded, NamedDoc, Row } from "./types";
import { asGuid, asGuidArray, buildIconUrl, firstStoreishLink, normalizePath, extractYear, sourceUrlFallback } from "./utils";

async function getJson<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${path}${sep}v=${Date.now()}`;   // cache-bust
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

async function tryLoadMany<T>(candidates: string[], fallback: T): Promise<T> {
  for (const c of candidates) {
    try { return await getJson<T>(c); } catch { /* try next */ }
  }
  return fallback;
}

async function tryFetchJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    const text = await r.text();

    // If nginx gave us index.html instead of JSON, bail.
    const looksHtml = ct.includes("text/html") || text.trim().startsWith("<");
    if (looksHtml) return null;

    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function loadLibrary(): Promise<Loaded> {
  const games = await tryLoadMany<GameDoc[]>(FILES.games, []);
  const tags = await tryLoadMany<NamedDoc[]>(FILES.tags, []);
  const sources = await tryLoadMany<NamedDoc[]>(FILES.sources, []);
  const localInstalled = await tryFetchJson(FILES.localInstalled);
  const localInstalledSet = Array.isArray(localInstalled?.installed)
    ? new Set(localInstalled.installed.map((s: string) => String(s).toLowerCase()))
    : null;

  const normNamed = (x: NamedDoc) => ({
    id: asGuid(x.Id) ?? asGuid(x._id),
    name: x.Name ?? ""
  });

  const tagById = new Map(tags.map(normNamed).filter(t => t.id).map(t => [t.id as string, t.name]));
  const sourceById = new Map(sources.map(normNamed).filter(s => s.id).map(s => [s.id as string, s.name]));

  const rows: Row[] = games.map(g => {
    const id = asGuid(g.Id) ?? asGuid(g._id) ?? "";
    const tagIds = asGuidArray(g.TagIds);
    const sourceId = asGuid(g.SourceId);
    const sourceName = sourceId ? (sourceById.get(sourceId) ?? "") : "";
    const year =
      extractYear((g as any).ReleaseYear) ??
      extractYear((g as any).ReleaseDate) ??
      extractYear((g as any).Release) ??
      null;

    let url = firstStoreishLink(g.Links, sourceName);
    if (!url && sourceName) {
      const tmpl = sourceUrlFallback(sourceName.toLowerCase(), g.Name ?? "");
      if (tmpl) url = tmpl;
    }

    const iconRel = normalizePath((g as any).Icon);
    const iconId = asGuid((g as any).IconId);
    const iconUrl = buildIconUrl(iconRel, iconId);
    const installed = localInstalledSet ? localInstalledSet.has(id.toLowerCase()) : false; // only if new JSON exists

    return {
      id,
      title: g.Name ?? "(Untitled)",
      sortingName: (g as any).SortingName ?? g.Name ?? "",
      source: sourceName.toLowerCase().trim(),
      tags: (tagIds.map(tid => tagById.get(tid)).filter(Boolean) as string[]) ?? [],
      hidden: !!g.Hidden,
      url: url ?? null,
      iconUrl,
      year,
      installed,
      raw: g
    };
  });

  const allSources = Array.from(new Set(rows.map(r => r.source).filter(Boolean))).sort();
  const allTags = Array.from(new Set(rows.flatMap(r => r.tags).filter(Boolean))).sort();

  return { rows, allSources, allTags };
}
