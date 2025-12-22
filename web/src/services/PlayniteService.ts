import { fetchJson, fetchUser, getCreds } from "./AccountService";
import { API_ENDPOINTS, FILES } from "../constants";
import { PlayniteGame, PlayniteGameLink, PlayniteGameReleaseDate, PlayniteSeries, PlayniteSource, PlayniteTag } from "../types/playnite";
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
    if (name && version) {
        const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        name = name.replace(new RegExp(`\\s*${escaped}\\s*$`), "");
    }
    name = name?.replace(/\s*[:\-]\s*$/, "");
    return name ?? "Untitled";
}

// Get the SortingName (fallback to Name)
function getSortingName(sortingName: string | null | undefined, name: string | null | undefined): string {
    return sortingName ?? name ?? "";
}

function parseYearFromString(s: string): number | null {
    // Accept "2021", "2021-05-03", "2021/05/03", "2021-05", "May 5, 2021", etc.
    const m = s.match(/(\d{4})/);
    if (!m) return null;
    const y = Number(m[1]);
    if (y >= 1970 && y <= 2100) return y;
    return null;
}

function parseYearFromNumber(n: number): number | null {
    // Heuristic: treat 10 or 13 digits as epoch seconds/millis
    if (n > 10_000_000_000) {
        const y = new Date(n).getUTCFullYear();
        return y >= 1970 && y <= 2100 ? y : null;
    }
    if (n > 1_000_000_000) {
        const y = new Date(n * 1000).getUTCFullYear();
        return y >= 1970 && y <= 2100 ? y : null;
    }
    // maybe already a year
    if (n >= 1970 && n <= 2100) return n;
    return null;
}

function extractYear(val: unknown): number | null {
    if (val == null) return null;
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
    return null;
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

// Prefer Links matching source, then any Links, then sourcish fallback
function getEffectiveLink(links: PlayniteGameLink[] | undefined, title: string, source: string): string | undefined {
    if (!links || links.length === 0) return undefined;

    const s = source.toLowerCase();
    const hitStrings = [s, "store", "official"];

    // Try to find a link whose name directly matches or refers to a "store"
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
        return Object.entries(PLAYNITE_SOURCE_MAP).some(([key, payload]) =>
            s.includes(key) && payload.domains.some(domain => url.includes(domain))
        );
    });
    if (matchedLink?.Url) return matchedLink.Url;

    // Fallbacks per source
    switch (s) {
        case "steam":
            return `https://${PLAYNITE_SOURCE_MAP.steam?.online}/app/${encodeURIComponent(title)}`;
        case "gog":
            return `https://${PLAYNITE_SOURCE_MAP.gog?.online}/game/${encodeURIComponent(title)}`;
        case "ubisoft connect":
        case "uplay":
        case "ubisoft":
            return `https://${PLAYNITE_SOURCE_MAP["ubisoft connect"]?.online}/en-us/search?gss-q=${encodeURIComponent(title)}`;
        case "ea app":
            return undefined;
        case "battle.net":
            return undefined;
        case "epic":
            return `https://${PLAYNITE_SOURCE_MAP.epic?.online}/store/en-US/p/${encodeURIComponent(title)}`;
        case "xbox":
            return `https://${PLAYNITE_SOURCE_MAP.xbox?.online}/en-us/Search/Results?q=${encodeURIComponent(title)}`;
        case "microsoft store":
            return `https://${PLAYNITE_SOURCE_MAP["microsoft store"]?.online}/search?query=${encodeURIComponent(title)}`;
        case "humble":
            return `https://${PLAYNITE_SOURCE_MAP.humble?.online}/store/search?search=${encodeURIComponent(title)}`;
        case "nintendo":
            return `https://${PLAYNITE_SOURCE_MAP.nintendo?.online}/us/search/?q=${encodeURIComponent(title)}`;
        case "abandonware":
            return `https://${PLAYNITE_SOURCE_MAP.abandonware?.online}/search/q/${encodeURIComponent(title)}`;
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
            return `${PLAYNITE_SOURCE_MAP.steam?.platform}store/${encodeURIComponent(gameId)}`;
        case "gog":
            return `${PLAYNITE_SOURCE_MAP.gog?.platform}openGameView/${encodeURIComponent(gameId)}`;
        case "epic": {
            // get epic slug after product/ or p/ from href if possible
            const slug = href?.match(/\/product\/([^/?]+)/)?.[1] || href?.match(/\/p\/([^/?]+)/)?.[1];
            return slug
                ? `${PLAYNITE_SOURCE_MAP.epic?.platform}store/product/${encodeURIComponent(slug)}?action=show`
                : `${PLAYNITE_SOURCE_MAP.epic?.platform}`;
        }
        case "ubisoft connect":
        case "uplay":
        case "ubisoft":
            return `${PLAYNITE_SOURCE_MAP["ubisoft connect"]?.platform}launch/${encodeURIComponent(gameId)}/0`;
        case "ea app":
            const slug = href?.match(/\/product\/([^/?]+)/)?.[1] || href?.match(/\/p\/([^/?]+)/)?.[1];
            return slug
                ? `${PLAYNITE_SOURCE_MAP["ea app"]?.platform}store/product/${encodeURIComponent(slug)}?action=show`
                : `${PLAYNITE_SOURCE_MAP["ea app"]?.platform}launchgame/${encodeURIComponent(gameId)}`;
        case "battle.net":
            return `${PLAYNITE_SOURCE_MAP["battle.net"]?.platform}${encodeURIComponent(gameId)}`;
        case "xbox":
            return `${PLAYNITE_SOURCE_MAP.xbox?.platform}store/${encodeURIComponent(gameId)}`;
        case "humble":
            return undefined;
        case "nintendo":
            return undefined;
        case "microsoft store":
            return `${PLAYNITE_SOURCE_MAP["microsoft store"]?.platform}pdp/?productid=${encodeURIComponent(gameId)}`;
        case "abandonware":
            return undefined;
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
            `${FILES.installed.dir}/${email.toLowerCase()}.${FILES.installed.file}`,
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
function getPlayniteProtocolLink(isInstalled: boolean, id: string): string {
    return isInstalled ? `playnite://playnite/start/${id}` : `playnite://playnite/showgame/${id}`;
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

function buildAssetUrl(uri: string | null | undefined): string | undefined {
    const normUri = uri
        ?.replace(/\\/g, "/")
        .replace(/^\.?\//, '')
        .replace('libraryfiles/', '');
    if (!normUri) return undefined;
    else {
        if (/^https?:\/\//i.test(normUri)) return normUri;
        else return `${FILES.libraryfiles.dir}/${normUri}`;
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

    // index maps (Id -> Name)
    const tagById = new Map<string, string>(tags.map((t) => [t.Id, t.Name]));
    const sourceById = new Map<string, string>(sources.map((s) => [s.Id, s.Name]));
    const seriesById = new Map<string, string>(series.map((s) => [s.Id, s.Name]));

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
        const source = getSource(g, sourceById);
        const htmlLink = getEffectiveLink(g.Links, title, source);
        const sourceLink = getSourceProtocolLink(source, gameId, htmlLink);
        const links = getLinks(g.Links);
        const isHidden = getIsHidden(g.Hidden);
        const isInstalled = getInstalled(g.Id, isInstalledSet);
        const playniteLink = getPlayniteProtocolLink(isInstalled, id);
        const tags = getTagNames(g.TagIds, tagById);
        const series = getSeriesNames(g.SeriesIds, seriesById);
        const iconUrl = getIconUrl(g.Icon);
        const coverUrl = getCoverUrl(g.CoverImage);
        const bgUrl = getBgUrl(g.BackgroundImage);

        // return the InterLinkedGameItem
        return {
            type, origin,
            id, gameId,
            title, sortingName,
            year, version,
            source, sourceLink,
            htmlLink, links,
            playniteLink,
            isHidden, isInstalled,
            tags, series,
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

export const PLAYNITE_SOURCE_MAP: Record<string, {
    platform?: string;
    online: string;
    domains: string[];
    label: string;
}> = {
    "steam": {
        platform: "steam://",
        online: "store.steampowered.com",
        domains: ["steampowered.com"],
        label: "Steampowered",
    },
    "gog": {
        platform: "goggalaxy://",
        online: "www.gog.com",
        domains: ["gog.com"],
        label: "Good Old Games",
    },
    "ubisoft connect": {
        platform: "uplay://",
        online: "www.ubisoft.com",
        domains: ["ubisoft.com", "uplay"],
        label: "Ubisoft Connect",
    },
    "ea app": {
        platform: "link2ea://",
        online: "www.ea.com/origin",
        domains: ["ea.com", "origin.com"],
        label: "EA App",
    },
    "battle.net": {
        platform: "battlenet://",
        online: "www.battle.net",
        domains: ["battle.net", "blizzard.com"],
        label: "Battle.net",
    },
    "epic": {
        platform: "com.epicgames.launcher://",
        online: "www.epicgames.com",
        domains: ["epicgames.com"],
        label: "Epic Games",
    },
    "xbox": {
        platform: "xbox://",
        online: "www.xbox.com",
        domains: ["xbox.com", "microsoft.com"],
        label: "XBox"
    },
    "microsoft store": {
        platform: "ms-windows-store://",
        domains: ["microsoft.com"],
        online: "apps.microsoft.com",
        label: "Microsoft Store"
    },
    "humble": {
        platform: "humble://",
        domains: ["humblebundle.com"],
        online: "www.humblebundle.com",
        label: "Humble Bundle"
    },
    "nintendo": {
        platform: "nintendo://",
        domains: ["nintendo.com"],
        online: "www.nintendo.com",
        label: "Nintendo"
    },
    "playnite": {
        domains: ["playnite.com"],
        online: "www.playnite.com",
        label: "Playnite",
    },
    "abandonware": {
        domains: ["myabandonware.com"],
        online: "www.myabandonware.com",
        label: "Abandonware"
    },
    "emulator": {
        domains: ["www.romsgames.net"],
        online: "www.romsgames.net",
        label: "Emulator"
    },
};

export const EXT_STATE_DEFAULTS = {
    connected: false,
    lastPingAt: null as string | null,
    loading: true,
};

export const PLAYNITE_COLLECTIONS_LIST = [
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
