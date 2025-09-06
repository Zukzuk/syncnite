import type { GameDoc, NamedDoc, Row } from "./types";
import { asGuid, asGuidArray, buildIconUrl, firstStoreishLink, normalizePath, sourceUrlTemplates, extractYear } from "./utils";

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

const BASE = "/data";
const FILES = {
  games: [
    `${BASE}/games.Game.json`,
  ],
  tags: [
    `${BASE}/tags.Tag.json`,
  ],
  sources: [
    `${BASE}/sources.GameSource.json`,
    `${BASE}/sources.Source.json`,
  ],
};

export type Loaded = {
  rows: Row[];
  allSources: string[];
  allTags: string[];
};

export async function loadLibrary(): Promise<Loaded> {
  const games = await tryLoadMany<GameDoc[]>(FILES.games, []);
  const tags = await tryLoadMany<NamedDoc[]>(FILES.tags, []);
  const sources = await tryLoadMany<NamedDoc[]>(FILES.sources, []);

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
      const tmpl = sourceUrlTemplates[sourceName.toLowerCase()];
      if (tmpl) url = tmpl(g);
    }

    const iconRel = normalizePath((g as any).Icon);
    const iconId = asGuid((g as any).IconId);
    const iconUrl = buildIconUrl(iconRel, iconId);
    const installed = (g as any).IsInstalled === true;

    return {
      id,
      title: g.Name ?? "(Untitled)",
      sortingName: (g as any).SortingName ?? g.Name ?? "",
      source: sourceName,
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
