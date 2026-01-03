// PlexService.ts (drop-in replacement / patch)
// Adds required: originLink
// Prefers: htmlLink (built from Plex status serverUrl)
// Also sets: originRunLink (best-effort)
// And stamps originLink on parts (episode + audiobook tracks)

import { fetchUser, getCreds } from "./AccountService";
import { API_ENDPOINTS, FILES, PLEX_COLLECTIONS, PlexCollection } from "../constants";
import type {
  OriginLoadedData,
  InterLinkedType,
  InterLinkedItem,
  InterLinkedItemPart,
  InterLinkedMovieItem,
  InterLinkedShowItem,
  InterLinkedAudiobookItem,
} from "../types/interlinked";
import type { PlexMetadata, PlexStatusResponse } from "../types/plex";

function plexEntityId(m: PlexMetadata): string {
  const section = String((m as any).librarySectionID ?? "0");
  const rk = String((m as any).ratingKey ?? "");
  return `${section}:${rk}`;
}

function getTitle(title?: string | null): string {
  return (title ?? "").trim() || "Untitled";
}

function getSortingName(titleSort?: string | null, title?: string | null): string | undefined {
  const s = (titleSort ?? "").trim();
  if (s) return s;
  const t = (title ?? "").trim();
  return t || undefined;
}

function toTagList(x: any): string[] {
  if (!x) return [];
  const arr = Array.isArray(x) ? x : [x];
  return arr.map(t => String(t?.tag ?? "").trim()).filter(Boolean);
}

function uniqPreserveOrder(xs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const t = (x ?? "").trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function getSearchableDescription(text?: string | null): string {
  return (text ?? "").toLowerCase();
}

function plexMediaUrl(sectionId: string, m: PlexMetadata, kind: "thumb" | "art" | "clearLogo") {
  const rk = String((m as any).ratingKey ?? "").trim();
  if (!sectionId || !rk) return undefined;
  return `${FILES.plex.media.dir}/${sectionId}/${rk}/${kind}.jpg`;
}

function mediaTypeFromCollection(collection: PlexCollection): InterLinkedType {
  switch (collection) {
    case "movies": return "movie";
    case "series": return "show";
    case "animated-movies": return "movie";
    case "animated-series": return "show";
    case "audiobooks": return "audiobook";
    default: return "movie";
  }
}

function plexType(m: PlexMetadata): string {
  return String((m as any).type ?? "").toLowerCase();
}

function getEditionVersion(m: PlexMetadata): string | undefined {
  const v = String((m as any).EditionTitle ?? (m as any).editionTitle ?? "").trim();
  return v || undefined;
}

function stripVersionFromTitle(title: string, version?: string): string {
  if (!title || !version) return title;
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const leftBoundary = `(?:^|[\\s:;,_\\-\\(\\[\\{\\/\\\\])`;
  const rightBoundary = `(?:$|[\\s:;,_\\-\\)\\]\\}\\/\\\\])`;
  const pattern = new RegExp(
    `${leftBoundary}(?:[:\\-]\\s*)?(?:[\\(\\[\\{]\\s*)?${escaped}(?:\\s*[\\)\\]\\}])?${rightBoundary}`,
    "gi"
  );
  return title
    .replace(pattern, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[:\\-]\\s*$/, "")
    .trim();
}

// --- New: link builders (htmlLink preferred; originLink required) ---

function plexDetailsKey(m: PlexMetadata): string {
  return `/library/metadata/${encodeURIComponent(String((m as any).ratingKey ?? ""))}`;
}

function normalizeBaseUrl(url?: string): string | undefined {
  const base = (url ?? "").trim().replace(/\/+$/, "");
  return base || undefined;
}

function plexHtmlLink(serverUrl: string | undefined, m: PlexMetadata): string | undefined {
  const base = normalizeBaseUrl(serverUrl);
  const rk = String((m as any).ratingKey ?? "").trim();
  if (!base || !rk) return undefined;
  // Works for your local plex web (serverUrl already points to PMS)
  return `${base}/web/index.html#!/details?key=${encodeURIComponent(plexDetailsKey(m))}`;
}

function plexOriginLink(serverUrl: string | undefined, m: PlexMetadata): string {
  // required field: prefer htmlLink, fallback to stable token
  const html = plexHtmlLink(serverUrl, m);
  if (html) return html;
  const section = String((m as any).librarySectionID ?? "0");
  const rk = String((m as any).ratingKey ?? "");
  return `plex:item:${section}:${rk}`;
}

function plexRunLink(serverUrl: string | undefined, m: PlexMetadata): string | undefined {
  const h = plexHtmlLink(serverUrl, m);
  return h ? `${h}&play=1` : undefined;
}

// --- Existing mapping rules ---

function buildSeriesArray(collectionKey: PlexCollection, m: PlexMetadata, showTitle?: string): string[] {
  const series: string[] = [];
  series.push(PLEX_COLLECTIONS[collectionKey]);
  series.push(...toTagList((m as any).Collection));
  if (showTitle) series.push(showTitle);
  return uniqPreserveOrder(series);
}

function buildTagsArray(m: PlexMetadata): string[] {
  const tags: string[] = [];
  tags.push(...toTagList((m as any).Genre));
  tags.push(...toTagList((m as any).Category));
  tags.push(...toTagList((m as any).Label));
  return uniqPreserveOrder(tags);
}

function pad2(n: number): string {
  const s = String(n);
  return s.length >= 2 ? s : `0${s}`;
}

function episodeDisplayTitle(m: PlexMetadata): string {
  const t = getTitle((m as any).title);
  const season = (m as any).parentIndex;
  const ep = (m as any).index;
  if (typeof season === "number" && typeof ep === "number") {
    return `S${pad2(season)}E${pad2(ep)} · ${t}`;
  }
  return t;
}

function episodeDurationMs(m: PlexMetadata): number | undefined {
  const medias = (m as any).Media;
  if (!Array.isArray(medias) || medias.length === 0) return undefined;

  const md = medias[0];
  const pd = Array.isArray(md?.Part) && md.Part.length > 0 ? md.Part[0]?.duration : undefined;

  if (typeof pd === "number") return pd;
  if (typeof md?.duration === "number") return md.duration;
  return undefined;
}

function partSeries(showTitle: string, season?: number): string[] {
  const s: string[] = [showTitle];
  if (typeof season === "number") s.push(`Season ${season}`);
  return s;
}

function buildEpisodePart(sectionId: string, serverUrl: string | undefined, showTitle: string, m: PlexMetadata): InterLinkedItemPart {
  const season = typeof (m as any).parentIndex === "number" ? (m as any).parentIndex : undefined;
  const title = episodeDisplayTitle(m);

  const htmlLink = plexHtmlLink(serverUrl, m);
  const originLink = plexOriginLink(serverUrl, m);

  return {
    type: "episode",
    origin: "plex",
    id: plexEntityId(m),
    title,
    titleWithoutVersion: title,
    isHidden: false,
    tags: [],
    series: partSeries(showTitle, season),

    originLink,
    originRunLink: plexRunLink(serverUrl, m),
    htmlLink,

    description: (m as any).summary ?? undefined,
    searchableDescription: getSearchableDescription((m as any).summary),
    sortingName: getSortingName((m as any).titleSort, (m as any).title),
    year: typeof (m as any).year === "number" ? (m as any).year : undefined,
    coverUrl: plexMediaUrl(sectionId, m, "thumb"),
    bgUrl: plexMediaUrl(sectionId, m, "art"),
    iconUrl: plexMediaUrl(sectionId, m, "clearLogo"),

    partType: "episode",
    season,
    index: typeof (m as any).index === "number" ? (m as any).index : undefined,
    durationMs: episodeDurationMs(m),
  };
}

function buildAudiobookParts(
  bookItemId: string,
  bookTitle: string,
  m: PlexMetadata,
  bookOriginLink: string,
  bookHtmlLink?: string
): { parts: InterLinkedItemPart[]; totalDurationMs?: number } {
  const parts: InterLinkedItemPart[] = [];
  const medias = (m as any).Media;
  if (!Array.isArray(medias)) return { parts: [] };

  let total = 0;
  let runningIndex = 1;

  for (const media of medias) {
    const mediaDuration = typeof media?.duration === "number" ? media.duration : undefined;
    const mediaParts = media?.Part;

    if (Array.isArray(mediaParts) && mediaParts.length > 0) {
      for (const p of mediaParts) {
        const file = typeof p?.file === "string" ? p.file : undefined;
        const dur = typeof p?.duration === "number" ? p.duration : mediaDuration;
        if (typeof dur === "number") total += dur;

        const title = file
          ? (file.split(/[\\/]/).pop() ?? `Part ${runningIndex}`)
          : `Part ${runningIndex}`;

        parts.push({
          type: "track",
          origin: "plex",
          id: `${bookItemId}#${runningIndex}`,
          title,
          titleWithoutVersion: title,
          isHidden: false,
          tags: [],
          series: [bookTitle],

          // ✅ required + prefer htmlLink if you want clicks to open book in plex
          originLink: bookOriginLink,
          htmlLink: bookHtmlLink,

          partType: "track",
          index: runningIndex,
          durationMs: typeof dur === "number" ? dur : undefined,
          filePath: file,
        });

        runningIndex++;
      }
    } else {
      const dur = mediaDuration;
      if (typeof dur === "number") total += dur;

      const title = `Part ${runningIndex}`;

      parts.push({
        type: "track",
        origin: "plex",
        id: `${bookItemId}#${runningIndex}`,
        title,
        titleWithoutVersion: title,
        isHidden: false,
        tags: [],
        series: [bookTitle],

        originLink: bookOriginLink,
        htmlLink: bookHtmlLink,

        partType: "track",
        index: runningIndex,
        durationMs: typeof dur === "number" ? dur : undefined,
      });

      runningIndex++;
    }
  }

  return { parts, totalDurationMs: parts.length ? total : undefined };
}

async function loadPlexCollection(collection: PlexCollection): Promise<PlexMetadata[]> {
  const creds = getCreds();
  if (!creds) return [];

  const resp = await fetch(`${API_ENDPOINTS.PLEX_COLLECTION}${encodeURIComponent(collection)}`, {
    headers: {
      "x-auth-email": creds.email,
      "x-auth-password": creds.password,
    },
  });

  if (!resp.ok) return [];
  const text = await resp.text();
  const rows = JSON.parse(text);
  return Array.isArray(rows) ? (rows as PlexMetadata[]) : [];
}

async function loadPlexStatus(): Promise<PlexStatusResponse | null> {
  const creds = getCreds();
  if (!creds) return null;

  // NOTE: you must have API_ENDPOINTS.PLEX_STATUS defined (your UI already uses PlexStatusResponse)
  const resp = await fetch(API_ENDPOINTS.PLEX_STATUS, {
    headers: {
      "x-auth-email": creds.email,
      "x-auth-password": creds.password,
    },
  });

  if (!resp.ok) return null;
  try {
    return (await resp.json()) as PlexStatusResponse;
  } catch {
    return null;
  }
}

export async function loadPlexOrigin(): Promise<OriginLoadedData> {
  fetchUser();

  const status = await loadPlexStatus();
  const serverUrl = status?.serverUrl;

  const collectionKeys = Object.keys(PLEX_COLLECTIONS) as PlexCollection[];
  const items: InterLinkedItem[] = [];

  type ShowKey = string;
  type ShowBucket = {
    collectionKey: PlexCollection;
    type: InterLinkedType;
    showTitle: string;
    sectionId: string;
    showRatingKey?: string;

    tags: string[];
    series: string[];

    year?: number;
    description?: string;
    searchableDescription?: string;
    sortingName?: string;

    coverUrl?: string;
    bgUrl?: string;
    iconUrl?: string;

    originLink?: string;
    originRunLink?: string;
    htmlLink?: string;

    parts: InterLinkedItemPart[];
  };
  const showBuckets = new Map<ShowKey, ShowBucket>();

  for (const c of collectionKeys) {
    const rows = await loadPlexCollection(c);
    const type = mediaTypeFromCollection(c);


    for (const m of rows) {
      const pt = plexType(m);
      const sectionId = String((m as any).librarySectionID ?? "").trim();

      // MOVIES
      if (c === "movies" || c === "animated-movies") {
        const title = getTitle((m as any).title);
        const version = getEditionVersion(m);
        const titleWithoutVersion = stripVersionFromTitle(title, version);

        const htmlLink = plexHtmlLink(serverUrl, m);
        const originLink = plexOriginLink(serverUrl, m);

        const movie: InterLinkedMovieItem = {
          type,
          origin: "plex",
          id: plexEntityId(m),
          title,
          titleWithoutVersion,
          isHidden: false,
          tags: buildTagsArray(m),
          series: buildSeriesArray(c, m),
          version,

          originLink,
          originRunLink: plexRunLink(serverUrl, m),
          htmlLink,

          description: (m as any).summary ?? undefined,
          searchableDescription: getSearchableDescription((m as any).summary),
          sortingName: getSortingName((m as any).titleSort, (m as any).title),
          year: typeof (m as any).year === "number" ? (m as any).year : undefined,
          coverUrl: plexMediaUrl(sectionId, m, "thumb"),
          bgUrl: plexMediaUrl(sectionId, m, "art"),
          iconUrl: plexMediaUrl(sectionId, m, "clearLogo"),
        };

        items.push(movie);
        continue;
      }

      // AUDIOBOOKS
      if (c === "audiobooks") {
        const title = getTitle((m as any).title);
        const version = getEditionVersion(m);
        const titleWithoutVersion = stripVersionFromTitle(title, version);

        const id = plexEntityId(m);

        const htmlLink = plexHtmlLink(serverUrl, m);
        const originLink = plexOriginLink(serverUrl, m);

        const { parts, totalDurationMs } = buildAudiobookParts(id, title, m, originLink, htmlLink);

        const book: InterLinkedAudiobookItem = {
          type,
          origin: "plex",
          id,
          title,
          titleWithoutVersion,
          isHidden: false,
          tags: buildTagsArray(m),
          series: buildSeriesArray(c, m),
          version,

          originLink,
          originRunLink: plexRunLink(serverUrl, m),
          htmlLink,

          description: (m as any).summary ?? undefined,
          searchableDescription: getSearchableDescription((m as any).summary),
          sortingName: getSortingName((m as any).titleSort, (m as any).title),
          year: typeof (m as any).year === "number" ? (m as any).year : undefined,
          coverUrl: plexMediaUrl(sectionId, m, "thumb"),
          bgUrl: plexMediaUrl(sectionId, m, "art"),
          iconUrl: plexMediaUrl(sectionId, m, "clearLogo"),

          parts,
          totalDurationMs,
        };

        items.push(book);
        continue;
      }

      // SERIES / ANIMATED-SERIES (show item + episode parts)
      if (c === "series" || c === "animated-series") {
        // seed from show objects if present
        if (pt === "show") {
          const showTitle = getTitle((m as any).title);
          const showRatingKey = String((m as any).ratingKey ?? "").trim();
          const showKey: ShowKey = `${sectionId}:${showRatingKey || encodeURIComponent(showTitle)}`;

          const baseTags = buildTagsArray(m);
          const baseSeries = buildSeriesArray(c, m, showTitle);

          const htmlLink = plexHtmlLink(serverUrl, m);
          const originLink = plexOriginLink(serverUrl, m);
          const originRunLink = plexRunLink(serverUrl, m);

          const existing = showBuckets.get(showKey);
          if (!existing) {
            showBuckets.set(showKey, {
              collectionKey: c,
              type: "show",
              showTitle,
              sectionId,
              showRatingKey: showRatingKey || undefined,
              tags: baseTags,
              series: baseSeries,

              originLink,
              originRunLink,
              htmlLink,

              year: typeof (m as any).year === "number" ? (m as any).year : undefined,
              description: (m as any).summary ?? undefined,
              searchableDescription: getSearchableDescription((m as any).summary),
              sortingName: getSortingName((m as any).titleSort, showTitle),
              coverUrl: plexMediaUrl(sectionId, m, "thumb"),
              bgUrl: plexMediaUrl(sectionId, m, "art"),
              iconUrl: plexMediaUrl(sectionId, m, "clearLogo"),
              parts: [],
            });
          } else {
            existing.tags = uniqPreserveOrder([...existing.tags, ...baseTags]);
            existing.series = uniqPreserveOrder([...existing.series, ...baseSeries]);
            existing.year ??= typeof (m as any).year === "number" ? (m as any).year : undefined;
            existing.description ??= (m as any).summary ?? undefined;
            existing.searchableDescription ??= getSearchableDescription((m as any).summary);
            existing.sortingName ??= getSortingName((m as any).titleSort, showTitle);
            existing.coverUrl ??= plexMediaUrl(sectionId, m, "thumb");
            existing.bgUrl ??= plexMediaUrl(sectionId, m, "art");
            existing.iconUrl ??= plexMediaUrl(sectionId, m, "clearLogo");

            // keep first good links
            existing.originLink ??= originLink;
            existing.originRunLink ??= originRunLink;
            existing.htmlLink ??= htmlLink;
          }
          continue;
        }

        // attach episodes
        if (pt === "episode") {
          const showTitle = String((m as any).grandparentTitle ?? "").trim() || "Untitled Show";

          const showRatingKeyFromEpisode = String(
            (m as any).grandparentRatingKey ?? (m as any).grandparentKey ?? ""
          ).trim();

          const showKey: ShowKey = `${sectionId}:${showRatingKeyFromEpisode || encodeURIComponent(showTitle)}`;

          let bucket = showBuckets.get(showKey);
          if (!bucket) {
            // create bucket from episode payload (links will be improved later if a show object is present)
            bucket = {
              collectionKey: c,
              type: "show",
              showTitle,
              sectionId,
              showRatingKey: showRatingKeyFromEpisode || undefined,
              tags: buildTagsArray(m),
              series: buildSeriesArray(c, m, showTitle),

              originLink: plexOriginLink(serverUrl, m),
              originRunLink: plexRunLink(serverUrl, m),
              htmlLink: plexHtmlLink(serverUrl, m),

              year: typeof (m as any).year === "number" ? (m as any).year : undefined,
              description: (m as any).summary ?? undefined,
              searchableDescription: getSearchableDescription((m as any).summary),
              sortingName: getSortingName((m as any).titleSort, showTitle),
              coverUrl: plexMediaUrl(sectionId, m, "thumb"),
              bgUrl: plexMediaUrl(sectionId, m, "art"),
              iconUrl: plexMediaUrl(sectionId, m, "clearLogo"),
              parts: [],
            };
            showBuckets.set(showKey, bucket);
          } else {
            bucket.tags = uniqPreserveOrder([...bucket.tags, ...buildTagsArray(m)]);
            bucket.series = uniqPreserveOrder([...bucket.series, ...buildSeriesArray(c, m, showTitle)]);
            bucket.year ??= typeof (m as any).year === "number" ? (m as any).year : undefined;
            bucket.coverUrl ??= plexMediaUrl(sectionId, m, "thumb");
            bucket.bgUrl ??= plexMediaUrl(sectionId, m, "art");
            bucket.iconUrl ??= plexMediaUrl(sectionId, m, "clearLogo");
          }

          bucket.parts.push(buildEpisodePart(sectionId, serverUrl, showTitle, m));
          continue;
        }

        continue;
      }
    }
  }

  // Emit show items
  for (const [, b] of showBuckets) {
    b.parts.sort((a, c) => (a.season ?? 0) - (c.season ?? 0) || (a.index ?? 0) - (c.index ?? 0));

    const totalDurationMs = b.parts.reduce((sum, p) => sum + (p.durationMs ?? 0), 0) || undefined;

    const seasons = Array.from(
      new Set(b.parts.map(p => p.season).filter((n): n is number => typeof n === "number"))
    ).sort((x, y) => x - y);
    const seasonSeries = seasons.map(n => `Season ${n}`);

    const id = b.showRatingKey
      ? `${b.sectionId}:${b.showRatingKey}`
      : `${b.sectionId}:${encodeURIComponent(b.showTitle)}`;

    const title = b.showTitle;

    const show: InterLinkedShowItem = {
      type: "show",
      origin: "plex",
      id,
      title,
      titleWithoutVersion: title,
      isHidden: false,
      tags: b.tags,
      series: uniqPreserveOrder([...b.series, ...seasonSeries]),

      originLink: b.originLink ?? `plex:show:${id}`,
      originRunLink: b.originRunLink,
      htmlLink: b.htmlLink,

      description: b.description,
      searchableDescription: b.searchableDescription,
      sortingName: b.sortingName ?? b.showTitle,
      year: b.year,
      coverUrl: b.coverUrl,
      bgUrl: b.bgUrl,
      iconUrl: b.iconUrl,

      parts: b.parts,
      totalDurationMs,
    };

    items.push(show);
  }

  const allSources: string[] = ["plex"];
  const allTags = Array.from(new Set(items.flatMap(i => i.tags))).sort();
  const allSeries = Array.from(new Set(items.flatMap(i => i.series)));

  return { items, allSources, allTags, allSeries };
}

// load a Plex DB collection 
export async function loadDbCollection<T>(collection: PlexCollection): Promise<T[]> {
  const url = `${API_ENDPOINTS.PLEX_COLLECTION}${encodeURIComponent(collection)}`;

  try {
    const creds = getCreds();
    if (!creds) throw new Error("No credentials");

    const resp = await fetch(url, {
      headers: {
        "x-auth-email": creds.email,
        "x-auth-password": creds.password,
      },
    });

    const text = await resp.text();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to load DB collection:", e);
    return [];
  }
}
