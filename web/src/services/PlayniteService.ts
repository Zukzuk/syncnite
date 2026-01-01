import { fetchJson, fetchUser, getCreds } from "./AccountService";
import { API_ENDPOINTS, FILES, SOURCE_MAP } from "../constants";
import { PlayniteCompany, PlayniteGame, PlayniteGameLink, PlayniteGameReleaseDate, PlayniteSeries, PlayniteSource, PlayniteTag } from "../types/playnite";
import { InterLinkedGameItem, InterLinkedOrigin, OriginLoadedData } from "../types/interlinked";

// Get the Playnite Game.Id
function getPlayniteId(g: PlayniteGame): string {
    return g.Id;
}

// Get the GameId (external store id)
function getGameId(id: string): string {
    return String(id);
}

// Get the Game Title (default "Untitled")
function getTitle(name: string | null | undefined, version: string | null | undefined): string {
    return name ?? "Untitled";
}

// Get the SortingName (fallback to Name)
function getSortingName(sortingName: string | null | undefined, name: string | null | undefined): string | undefined {
    return sortingName ?? name ?? undefined;
}

function parseYearFromString(s: string): number | undefined {
    // Accept "2021", "2021-05-03", "2021/05/03", "2021-05", "May 5, 2021", etc.
    const m = s.match(/(\d{4})/);
    if (!m) return undefined;
    const y = Number(m[1]);
    if (y >= 1970 && y <= 2100) return y;
    return undefined;
}

function parseYearFromNumber(n: number): number | undefined {
    // Heuristic: treat 10 or 13 digits as epoch seconds/millis
    if (n > 10_000_000_000) {
        const y = new Date(n).getUTCFullYear();
        return y >= 1970 && y <= 2100 ? y : undefined;
    }
    if (n > 1_000_000_000) {
        const y = new Date(n * 1000).getUTCFullYear();
        return y >= 1970 && y <= 2100 ? y : undefined;
    }
    // maybe already a year
    if (n >= 1970 && n <= 2100) return n;
    return undefined;
}

function extractYear(val: unknown): number | undefined {
    if (val == null) return undefined;
    if (typeof val === "number") return parseYearFromNumber(val);
    if (typeof val === "string") return parseYearFromString(val);
    if (typeof val === "object") {
        const o = val as Record<string, unknown>;
        // Sync style
        if (typeof o["ReleaseDate"] === "string") return parseYearFromString(o["ReleaseDate"]);
        // LiteDB / BSON-style
        if (typeof o["$date"] === "string") return parseYearFromString(o["$date"]);
        if (typeof o["Date"] === "string") return parseYearFromString(o["Date"]);
        if (typeof o["Ticks"] === "number") {
            // Ticks since 0001; convert to ms
            const ticks = o["Ticks"];
            const ms = (ticks - 621355968000000000) / 10000;
            return parseYearFromNumber(ms);
        }
        // Generic Year or Value fields:
        if (typeof o["Year"] === "number") return parseYearFromNumber(o["Year"]);
        if (typeof o["Value"] === "string") return parseYearFromString(o["Value"]);
        if (typeof o["Value"] === "number") return parseYearFromNumber(o["Value"]);
    }
    return undefined;
}

// Prefer explicit ReleaseYear, otherwise derive from ReleaseDate.ReleaseDate ("yyyy-mm-dd")
function getYear(releaseYear: number | null | undefined, releaseDate: PlayniteGameReleaseDate | null | undefined): number | undefined {
    if (typeof releaseYear === "number") return releaseYear;
    const iso = releaseDate?.ReleaseDate;
    if (typeof iso === "string") {
        const y = extractYear(iso);
        return typeof y === "number" ? y : undefined;
    }
    return undefined;
}

// Get the Version (default "")
function getVersion(version: string | null | undefined): string | undefined {
    return !!version ? version : undefined;
}

// Get the HTML Description (default undefined)
function getHtmlDescription(html: string | null | undefined): string | undefined {
    return !!html ? html : undefined;
}

// Get the SearchableDescription (default undefined)
function getSearchableDescription(html: string | null | undefined): string | undefined {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").toLowerCase();
}

// Clean the title by removing version info
function getTtitleWithoutVersion(title: string, version: string | null | undefined): string {
    // Detects version as a standalone token, optionally wrapped by separators:
    // "version", ": version", "- version", "(version)", "[version]" anywhere in the title.
    if (!title || !version) return title;

    const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Boundaries: start/end OR whitespace OR common separators.
    // This prevents removing the version when it's embedded inside another word.
    const leftBoundary = `(?:^|[\\s:;,_\\-\\(\\[\\{\\/\\\\])`;
    const rightBoundary = `(?:$|[\\s:;,_\\-\\)\\]\\}\\/\\\\])`;

    // Allow optional wrappers like ": ", "- ", "(", "[", and matching closing wrappers.
    // We keep it permissive but still boundary-limited.
    const pattern = new RegExp(
        `${leftBoundary}(?:[:\\-]\\s*)?(?:[\\(\\[\\{]\\s*)?${escaped}(?:\\s*[\\)\\]\\}])?${rightBoundary}`,
        "gi"
    );

    // Replace matches with a single space (keeps words from concatenating),
    // then normalize whitespace and trim leftover trailing separators.
    return title
        .replace(pattern, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/\s*[:\-]\s*$/, "")
        .trim();
}

// Prefer Links matching source, then any Links, then sourcish fallback
function getEffectiveLink(links: PlayniteGameLink[] | undefined, title: string, source: string): string | undefined {
    if (!source || !title) return undefined;
    
    const s = source.toLowerCase();

    if (links?.length) {
        const hitStrings = [s, "store", "official"];

        // Try to find a link whose Name matches preferred strings
        const preferredLink = hitStrings.reduce<string | undefined>((result, needle) => {
            if (result) return result;

            const hit = links.find(link => {
                const name = (link.Name ?? "").toLowerCase();
                return name === needle || name.includes(needle);
            });

            return hit?.Url ?? undefined;
        }, undefined);
        if (preferredLink) return preferredLink;

        // Try to find a link whose URL matches known domains for the source
        const matchedLink = links.find(link => {
            const url = (link.Url ?? "").toLowerCase();
            return Object.entries(SOURCE_MAP).some(([key, payload]) =>
                s.includes(key) && payload.domains.some(domain => url.includes(domain))
            );
        });
        if (matchedLink?.Url) return matchedLink.Url;
    }

    // Fallbacks per source
    switch (s) {
        case "steam":
        case "gog":
        case "ubisoft connect":
        case "uplay":
        case "ubisoft":
        case "epic":
        case "xbox":
        case "microsoft store":
        case "humble":
        case "nintendo":
        case "abandonware":
        case "emulator":
            return `${SOURCE_MAP[s as InterLinkedOrigin].online}${encodeURIComponent(title)}`;
        case "ea app":
        case "battle.net":
        default:
            return undefined;
    }
}

// Get the source name (alphabetically first, lowercased)
function getSource(g: PlayniteGame, sourceById: Map<string, string>): InterLinkedOrigin {
    const id = g.SourceId ?? null;
    const name = id ? sourceById.get(id) ?? "" : "";
    return name.toLowerCase().trim() as InterLinkedOrigin;
}

// Get the source protocol link
function getSourceProtocolLink(source: InterLinkedOrigin, gameId: string | null, href: string | null | undefined): string | undefined {
    if (!source || !gameId) return undefined;
    const s = source.toLowerCase();

    switch (s) {
        case "steam":
        case "gog":
        case "battle.net":
        case "xbox":
        case "microsoft store":
        case "playnite":
            return `${SOURCE_MAP[s as InterLinkedOrigin].platform}${encodeURIComponent(gameId)}`;
        case "ubisoft connect":
        case "uplay":
        case "ubisoft":
            return `${SOURCE_MAP["ubisoft connect"].platform}${encodeURIComponent(gameId)}/0`;
        case "epic": {
            // get epic slug after product/ or p/ from href if possible
            const slug = href?.match(/\/product\/([^/?]+)/)?.[1] || href?.match(/\/p\/([^/?]+)/)?.[1];
            return slug
                ? `${SOURCE_MAP.epic.platform}${encodeURIComponent(slug)}?action=show`
                : undefined;
        }
        case "ea app":
        case "humble":
        case "nintendo":
        case "abandonware":
        case "emulator":
        default:
            return undefined;
    }
}

// Get all links
function getLinks(links: PlayniteGameLink[] | undefined): PlayniteGameLink[] | undefined {
    if (!links || links.length === 0) return undefined;
    return links;
}

// Get the Hidden flag (default false)
function getIsHidden(hidden: boolean | null | undefined): boolean {
    return !!hidden;
}

// Prefetch the local Installed.json (case-insensitive ids)
async function fetchInstalledList(email: string | null): Promise<Set<string> | undefined> {
    let localInstalledSet: Set<string> | undefined = undefined;
    if (email) {
        const localInstalled = await fetchJson(
            `${FILES.playnite.installed.dir}/${email.toLowerCase()}.${FILES.playnite.installed.file}`,
        );
        if (Array.isArray(localInstalled?.installed)) {
            localInstalledSet = new Set(
                localInstalled.installed.map((s: string) => String(s).toLowerCase())
            );
        }
    }
    return localInstalledSet;
}

// Check if installed (case-insensitive)
function getInstalled(id: string, installedSet: Set<string> | undefined): boolean {
    return installedSet ? installedSet.has(id.toLowerCase()) : false;
}

// Get Playnite protocol link
function getProtocolLink(isInstalled: boolean, id: string): string {
    return isInstalled
        ? `${SOURCE_MAP.playnite.runOnPlatform}${id}`
        : `${SOURCE_MAP.playnite.platform}${id}`;
}

// Get TagIds to Tag Names (ignore missing)
function getTagNames(ids: string[] | undefined, tagById: Map<string, string>): string[] {
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => tagById.get(id)).filter(Boolean) as string[];
}

// Get SeriesIds to Series Names (ignore missing)
function getSeriesNames(ids: string[] | undefined, seriesById: Map<string, string>): string[] {
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => seriesById.get(id)).filter(Boolean) as string[];
}

function getCompanyNames(ids: string[] | undefined, companyById: Map<string, string>): string[] {
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => companyById.get(id)).filter(Boolean) as string[];
}

function buildAssetUrl(uri: string | null | undefined): string | undefined {
    const normUri = uri
        ?.replace(/\\/g, "/")
        .replace(/^\.?\//, '')
        .replace('playnite/', '')
        .replace('libraryfiles/', '');
    if (!normUri) return undefined;
    else {
        if (/^https?:\/\//i.test(normUri)) return normUri;
        else return `${FILES.playnite.libraryfiles.dir}/${normUri}`;
    }
}

// Get Icon URL (if any)
function getIconUrl(icon: string | null | undefined): string | undefined {
    return buildAssetUrl(icon);
}

// Get CoverImage URL (if any)
function getCoverUrl(cover: string | null | undefined): string | undefined {
    return buildAssetUrl(cover);
}

// Get BackgroundImage URL (if any)
function getBgUrl(bg: string | null | undefined): string | undefined {
    return buildAssetUrl(bg);
}

// Load and process the full library data
export async function loadPlayniteOrigin(): Promise<OriginLoadedData> {
    // Get the user's email
    const email = fetchUser();

    // load raw data
    const games = await loadDbCollection<PlayniteGame>("games");
    const tags = await loadDbCollection<PlayniteTag>("tags");
    const sources = await loadDbCollection<PlayniteSource>("sources");
    const series = await loadDbCollection<PlayniteSeries>("series");
    const companies = await loadDbCollection<PlayniteCompany>("companies");

    // index maps (Id -> Name)
    const tagById = new Map<string, string>(tags.map((t) => [t.Id, t.Name]));
    const sourceById = new Map<string, string>(sources.map((s) => [s.Id, s.Name]));
    const seriesById = new Map<string, string>(series.map((s) => [s.Id, s.Name]));
    const companyById = new Map<string, string>(companies.map((c) => [c.Id, c.Name]));

    // prefetch installed set (case-insensitive ids)
    const isInstalledSet = await fetchInstalledList(email);

    // build items
    const items: InterLinkedGameItem[] = games.map((g) => {
        const type = "game";
        const origin = "playnite";
        const id = getPlayniteId(g);
        const gameId = getGameId(g.GameId);
        const title = getTitle(g.Name, g.Version);
        const sortingName = getSortingName(g.SortingName, g.Name);
        const year = getYear(g.ReleaseYear, g.ReleaseDate);
        const version = getVersion(g.Version);
        const description = getHtmlDescription(g.Description);
        const searchableDescription = getSearchableDescription(g.Description);
        const titleWithoutVersion = getTtitleWithoutVersion(title, version);
        const source = getSource(g, sourceById);
        const htmlLink = getEffectiveLink(g.Links, title, source);
        const sourceLink = getSourceProtocolLink(source, gameId, htmlLink);
        const links = getLinks(g.Links);
        const isHidden = getIsHidden(g.Hidden);
        const isInstalled = getInstalled(g.Id, isInstalledSet);
        const originLink = getProtocolLink(isInstalled, id);
        const originRunLink = getProtocolLink(false, id);
        const tags = getTagNames(g.TagIds, tagById);
        const series = getSeriesNames(g.SeriesIds, seriesById);
        const developers = getCompanyNames(g.DeveloperIds, companyById);
        const publishers = getCompanyNames(g.PublisherIds, companyById);
        const iconUrl = getIconUrl(g.Icon);
        const coverUrl = getCoverUrl(g.CoverImage);
        const bgUrl = getBgUrl(g.BackgroundImage);

        // return the InterLinkedGameItem
        return {
            type, origin,
            id, gameId,
            title, sortingName, titleWithoutVersion,
            year, version,
            description, searchableDescription,
            source, sourceLink,
            htmlLink, links,
            originLink, originRunLink,
            isHidden, isInstalled,
            tags, series,
            developers, publishers,
            iconUrl, coverUrl, bgUrl,
        };
    });

    // all unique (new Set dedupes) and sorted lists
    const allSources = Array.from(new Set(items.map((r) => r.source).filter(Boolean))).sort();
    const allTags = Array.from(new Set(items.flatMap((r) => r.tags).filter(Boolean))).sort();
    const allSeries = Array.from(new Set(items.flatMap((r) => r.series).filter(Boolean)))// .sort();

    // return full data
    return { items, allSources, allTags, allSeries };
}

export const PLAYNITE_COLLECTIONS = [
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
] as const;

// Load a DB collection via the API
export async function loadDbCollection<T>(collection: string): Promise<T[]> {
    const url = `${API_ENDPOINTS.PLAYNITE_COLLECTION}${encodeURIComponent(collection)}`;

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

// Fetch the status of the browser extension connection
export async function fetchExtensionStatus(): Promise<{
    ok: boolean;
    connected: boolean;
    extVersion: string | null;
    versionMismatch: boolean;
    lastPingAt: string | null;
}> {
    const creds = getCreds();
    if (!creds) return { ok: false, connected: false, extVersion: null, versionMismatch: false, lastPingAt: null };

    const resp = await fetch(API_ENDPOINTS.EXTENSION_STATUS, {
        headers: {
            "x-auth-email": creds.email,
            "x-auth-password": creds.password,
        },
    });

    if (!resp.ok) {
        return { ok: false, connected: false, extVersion: null, versionMismatch: false, lastPingAt: null };
    }

    const payload = await resp.json();
    return payload;
}
