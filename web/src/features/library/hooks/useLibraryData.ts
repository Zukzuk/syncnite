import * as React from "react";
import type { Game, GameLink, GameReleaseDate, Series, Source, Tag } from "../../../types/playnite";
import { PLAYNITE_COLLECTIONS, FILE_BASE, SOURCE_MAP } from "../../../lib/constants";
import { loadDbCollection } from "../../../lib/api";
import { fetchJson, fetchUser } from "../../../lib/utils";
import { GameItem, LoadedData } from "../../../types/types";
import { useLocalInstalled } from "../../../hooks/useLocalInstalled";
import { useLibraryRefresh } from "./useLibraryRefresh";

// Get the Playnite Game.Id
function getPlayniteId(g: Game): string {
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
function getYear(releaseYear: number | null | undefined, releaseDate: GameReleaseDate | null | undefined): number | null {
    if (typeof releaseYear === "number") return releaseYear;
    const iso = releaseDate?.ReleaseDate;
    if (typeof iso === "string") {
        const y = extractYear(iso);
        return typeof y === "number" ? y : null;
    }
    return null;
}
// Get the Version (default "")
function getVersion(version: string | null | undefined): string | null {
    return !!version ? version : null;
}

// Prefer Links matching source, then any Links, then sourcish fallback
function getEffectiveLink(links: GameLink[] | undefined, title: string, source: string): string | null {
    if (!links || links.length === 0) return null;

    const s = source.toLowerCase();

    // Try to find a link whose name directly matches or refers to a "store"
    const preferredLink = links.find(link => {
        const name = (link.Name ?? "").toLowerCase();
        return name.includes("store") || name.includes(s) || name.includes("official");
    });
    if (preferredLink?.Url) return preferredLink.Url;

    // Try to find a link whose URL matches known domains for the source
    const matchedLink = links.find(link => {
        const url = (link.Url ?? "").toLowerCase();
        return Object.entries(SOURCE_MAP).some(([key, payload]) =>
            s.includes(key) && payload.domains.some(domain => url.includes(domain))
        );
    });
    if (matchedLink?.Url) return matchedLink.Url;

    // Fallbacks per source
    switch (s) {
        case "steam":
            return `https://${SOURCE_MAP.steam.online}/app/${encodeURIComponent(title)}`;
        case "gog":
            return `https://${SOURCE_MAP.gog.online}/game/${encodeURIComponent(title)}`;
        case "ubisoft connect":
        case "uplay":
        case "ubisoft":
            return `https://${SOURCE_MAP["ubisoft connect"].online}/en-us/search?gss-q=${encodeURIComponent(title)}`;
        case "ea app":
            return null;
        case "battle.net":
            return null;
        case "epic":
            return `https://${SOURCE_MAP.epic.online}/store/en-US/p/${encodeURIComponent(title)}`;
        case "xbox":
            return `https://${SOURCE_MAP.xbox.online}/en-us/Search/Results?q=${encodeURIComponent(title)}`;
        case "microsoft store":
            return `https://${SOURCE_MAP["microsoft store"].online}/search?query=${encodeURIComponent(title)}`;
        case "humble":
            return `https://${SOURCE_MAP.humble.online}/store/search?search=${encodeURIComponent(title)}`;
        case "nintendo":
            return `https://${SOURCE_MAP.nintendo.online}/us/search/?q=${encodeURIComponent(title)}`;
        case "abandonware":
            return `https://${SOURCE_MAP.abandonware.online}/search/q/${encodeURIComponent(title)}`;
        default:
            return null;
    }
}

// Get the source name (alphabetically first, lowercased)
function getSource(g: Game, sourceById: Map<string, string>): string {
    const id = g.SourceId ?? null;
    const name = id ? sourceById.get(id) ?? "" : "";
    return name.toLowerCase().trim();
}

function getSourceProtocolLink(source: string, gameId: string | null, href: string | null): string | null {
    if (!source || !gameId) return null;
    const s = source.toLowerCase();

    switch (s) {
        case "steam":
            return `${SOURCE_MAP.steam.platform}store/${encodeURIComponent(gameId)}`;
        case "gog":
            return `${SOURCE_MAP.gog.platform}openGameView/${encodeURIComponent(gameId)}`;
        case "epic": {
            // get epic slug after product/ or p/ from href if possible
            const slug = href?.match(/\/product\/([^/?]+)/)?.[1] || href?.match(/\/p\/([^/?]+)/)?.[1];
            return slug ? `${SOURCE_MAP.epic.platform}store/product/${encodeURIComponent(slug)}?action=show` : `${SOURCE_MAP.epic.platform}`;
        }
        case "ubisoft connect":
        case "uplay":
        case "ubisoft":
            return `${SOURCE_MAP["ubisoft connect"].platform}launch/${encodeURIComponent(gameId)}/0`;
        case "ea app":
            const slug = href?.match(/\/product\/([^/?]+)/)?.[1] || href?.match(/\/p\/([^/?]+)/)?.[1];
            return slug ? `${SOURCE_MAP["ea app"].platform}store/product/${encodeURIComponent(slug)}?action=show` : `${SOURCE_MAP["ea app"].platform}launchgame/${encodeURIComponent(gameId)}`;
        // return `${SOURCE_MAP["ea app"].platform}launchgame/${encodeURIComponent(gameId)}`;
        case "battle.net":
            return `${SOURCE_MAP["battle.net"].platform}${encodeURIComponent(gameId)}`;
        case "xbox":
            return `${SOURCE_MAP.xbox.platform}store/${encodeURIComponent(gameId)}`;
        case "humble":
            return null;
        case "nintendo":
            return null;
        case "microsoft store":
            return `${SOURCE_MAP["microsoft store"].platform}pdp/?productid=${encodeURIComponent(gameId)}`;
        case "abandonware":
            return null;
        default:
            return null;
    }
}

// Get all links
function getLinks(links: GameLink[] | undefined): GameLink[] | null {
    if (!links || links.length === 0) return null;
    return links;
}

// Get the Hidden flag (default false)
function getIsHidden(hidden: boolean | null | undefined): boolean {
    return !!hidden;
}

// Prefetch the local Installed.json (case-insensitive ids)
async function fetchInstalledList(email: string | null): Promise<Set<string> | null> {
    let localInstalledSet: Set<string> | null = null;
    if (email) {
        const localInstalled = await fetchJson(
            `/data/installed/${email.toLowerCase()}.installed.json`
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
function getInstalled(id: string, installedSet: Set<string> | null): boolean {
    return installedSet ? installedSet.has(id.toLowerCase()) : false;
}

// Get Playnite protocol link
function getPlayniteProtocolLink(isInstalled: boolean, id: string): string {
    return isInstalled ? "playnite://playnite/start" : `playnite://playnite/showgame/${id}`;
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

function buildAssetUrl(uri: string | null | undefined): string | null {
    const normUri = uri
        ?.replace(/\\/g, "/")
        .replace(/^\.?\//, '')
        .replace('libraryfiles/', '');
    if (!normUri) return null;
    else {
        if (/^https?:\/\//i.test(normUri)) return normUri;
        else return `${FILE_BASE}/libraryfiles/${normUri}`;
    }
}

// Get Icon URL (if any)
function getIconUrl(icon: string | null | undefined): string | null {
    return buildAssetUrl(icon);
}

// Get CoverImage URL (if any)
function getCoverUrl(cover: string | null | undefined): string | null {
    return buildAssetUrl(cover);
}

// Get BackgroundImage URL (if any)
function getBgUrl(bg: string | null | undefined): string | null {
    return buildAssetUrl(bg);
}

// Load and process the full library data
async function loadLibrary(): Promise<LoadedData> {
    // load raw data
    const games = await loadDbCollection<Game>(PLAYNITE_COLLECTIONS.games);
    const tags = await loadDbCollection<Tag>(PLAYNITE_COLLECTIONS.tags);
    const sources = await loadDbCollection<Source>(PLAYNITE_COLLECTIONS.sources);
    const series = await loadDbCollection<Series>(PLAYNITE_COLLECTIONS.series);

    // index maps (Id -> Name)
    const tagById = new Map<string, string>(tags.map((t) => [t.Id, t.Name]));
    const sourceById = new Map<string, string>(sources.map((s) => [s.Id, s.Name]));
    const seriesById = new Map<string, string>(series.map((s) => [s.Id, s.Name]));

    // Get the user's email
    const email = fetchUser();
    // prefetch installed set (case-insensitive ids)
    const isInstalledSet = await fetchInstalledList(email);

    // build items
    const items: GameItem[] = games.map((g) => {
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

        // return the GameItem
        return {
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

type UseParams = { pollMs: number };

type UseReturn = {
    libraryData: LoadedData | null;
    installedUpdatedAt: string | null;
};

// A hook to manage the library data with automatic refresh and installed status updates.
export function useLibraryData({ pollMs }: UseParams): UseReturn {
    const [libraryData, setData] = React.useState<LoadedData | null>(null);

    // external pollers
    const { version: libraryVersion } = useLibraryRefresh({ pollMs });
    const { set: installedSet, updatedAt: installedUpdatedAt } = useLocalInstalled({ pollMs });

    // reload on manifest change
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            const fresh = await loadLibrary();
            if (!cancelled) setData(fresh);
        })();
        return () => {
            cancelled = true;
        };
    }, [libraryVersion]);

    // fast "installed" patch when local installed changes
    React.useEffect(() => {
        if (!installedSet || !installedUpdatedAt) return;
        setData((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item) => ({
                ...item,
                isInstalled: installedSet.has(item.id.toLowerCase()),
            }));
            return { ...prev, items };
        });
    }, [installedUpdatedAt, installedSet]);

    return { libraryData, installedUpdatedAt };
}
