import * as React from "react";
import type { Game, GameLink, GameReleaseDate, Series, Source, Tag } from "../../../types/playnite";
import { COLLECTIONS, FILE_BASE, FALLBACK_ICON, SOURCE_MAP } from "../../../lib/constants";
import { loadDbCollection } from "../../../lib/api";
import { fetchUser } from "../../../lib/utils";
import { GameItem, LoadedData } from "../../../types/types";
import { useLibraryRefresh } from "./useLibraryRefresh";
import { useLocalInstalled } from "./useLocalInstalled";

// Get the Playnite Game.Id
function getPlayniteId(g: Game): string {
    return g.Id;
}

// Get the GameId (external store id)
function getGameId(id: string): string {
    return String(id);
}

// Get the Game Title (default "Untitled")
function getGameTitle(name: string | null | undefined): string {
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
function pickYear(releaseYear: number | null | undefined, releaseDate: GameReleaseDate | null | undefined): number | null {
    if (typeof releaseYear === "number") return releaseYear;
    const iso = releaseDate?.ReleaseDate;
    if (typeof iso === "string") {
        const y = extractYear(iso);
        return typeof y === "number" ? y : null;
    }
    return null;
}

function normalizePath(p?: string): string | null {
    if (!p) return null;
    return p.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function buildIconUrl(iconRel: string | null, iconId: string | null): string {
    if (iconRel && /^https?:\/\//i.test(iconRel)) return iconRel;
    if (iconRel) {
        const rel = iconRel.replace(/\\/g, "/").replace(/^\.?\//, "");
        const path = rel.startsWith("libraryfiles/") ? rel : `libraryfiles/${rel}`;
        return `${FILE_BASE}/${path}`;
    }
    if (iconId) return `${FILE_BASE}/libraryfiles/${iconId}.png`;
    return FALLBACK_ICON;
}

// Prefer Icon (path) but fall back to Id (legacy)
function pickIconUrl(icon: string | null | undefined): string {
    const iconRel = normalizePath(icon ?? undefined);
    // buildIconUrl historically accepts either a path and/or an id—pass only path here
    return buildIconUrl(iconRel, null);
}

function findSourcishLink(links: GameLink[] | undefined, sourceName: string): string | null {
    if (!links || links.length === 0) return null;

    const source = sourceName.toLowerCase();

    // Try to find a link whose name directly matches or refers to a "store"
    const preferredLink = links.find(link => {
        const name = (link.Name ?? "").toLowerCase();
        return name === "store" || name === source || name.includes("store");
    });

    if (preferredLink?.Url) return preferredLink.Url;

    // Try to match based on known domain patterns for common stores/platforms
    const domainMatches: Record<string, string[]> = {
        steam: ["steampowered.com"],
        epic: ["epicgames.com"],
        gog: ["gog.com"],
        ubisoft: ["ubisoft.com", "uplay"],
        ea: ["ea.com", "origin.com"],
        battle: ["battle.net", "blizzard.com"],
        xbox: ["xbox.com", "microsoft.com"],
        humble: ["humblebundle.com"],
        nintendo: ["nintendo.com"]
    };

    const matchedLink = links.find(link => {
        const url = (link.Url ?? "").toLowerCase();
        return Object.entries(domainMatches).some(([key, domains]) =>
            source.includes(key) && domains.some(domain => url.includes(domain))
        );
    });

    return matchedLink?.Url ?? null;
}

function sourcishLinkFallback(source: string, id: string): string | null {
    const s = source.toLowerCase();
    switch (s) {
        case "steam":
            return `${SOURCE_MAP.steam.online}/app/${encodeURIComponent(id)}`;

        case "gog":
            return `${SOURCE_MAP.gog.online}/game/${encodeURIComponent(id)}`;

        case "ubisoft connect":
        case "uplay":
        case "ubisoft":
            return `${SOURCE_MAP["ubisoft connect"].online}/en-us/search?gss-q=${encodeURIComponent(id)}`;

        case "ea app":
            return null;

        case "battle.net":
            return null;

        case "epic":
            return `${SOURCE_MAP.epic.online}/store/en-US/p/${encodeURIComponent(id)}`;

        case "xbox":
            return `${SOURCE_MAP.xbox.online}/en-us/Search/Results?q=${encodeURIComponent(id)}`;

        case "humble":
            return `${SOURCE_MAP.humble.online}/store/search?search=${encodeURIComponent(id)}`;

        case "nintendo":
            return `${SOURCE_MAP.nintendo.online}/us/search/?q=${encodeURIComponent(id)}`;

        case "microsoft store":
            return `${SOURCE_MAP["microsoft store"].online}/search?query=${encodeURIComponent(id)}`;

        default:
            return null;
    }
};

function hasEmulatorTag(tags?: string[]): boolean {
    return Array.isArray(tags) && tags.some(t => /\bemulator(s)?\b/i.test(t));
}

function myAbandonwareLink(title: string): string {
    return `https://www.myabandonware.com/search/q/${encodeURIComponent(title)}`;
}

// Prefer Links matching source, then any Links, then sourcish fallback
function getEffectiveLink(links: GameLink[] | undefined, name: string, source: string, title: string, tags: string[]): string | null {
    let url = findSourcishLink(links, source);
    if (!url && source) url = sourcishLinkFallback(source, name ?? "");
    if (url) return url;
    if (!source && !hasEmulatorTag(tags)) return myAbandonwareLink(title);
    return null;
}

// Get the Hidden flag (default false)
function getIsHidden(hidden: boolean | null | undefined): boolean {
    return !!hidden;
}

// Pick the "primary" source name (alphabetically first, lowercased)
function pickPrimarySourceName(g: Game, sourceById: Map<string, string>): string {
    const id = g.SourceId ?? null;
    const name = id ? sourceById.get(id) ?? "" : "";
    return name.toLowerCase().trim();
}

// Expand TagIds to Tag Names (ignore missing)
function expandTagNames(ids: string[] | undefined, tagById: Map<string, string>): string[] {
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => tagById.get(id)).filter(Boolean) as string[];
}

// Expand SeriesIds to Series Names (ignore missing)
function expandSeriesNames(ids: string[] | undefined, seriesById: Map<string, string>): string[] {
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => seriesById.get(id)).filter(Boolean) as string[];
}

// Fetch JSON with no-cache, return null on error
async function fetchJson(url: string): Promise<any | null> {
    try {
        const r = await fetch(url, { cache: "no-cache" });
        if (!r.ok) return null;
        const text = await r.text();
        return JSON.parse(text);
    } catch {
        return null;
    }
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

function buildAssetUrl(rel?: string | null): string | null {
    if (!rel) return null;
    const norm = normalizePath(rel);
    if (!norm) return null;
    if (/^https?:\/\//i.test(norm)) return norm;
    const path = norm.startsWith("libraryfiles/") ? norm : `libraryfiles/${norm}`;
    return `${FILE_BASE}/${path}`;
}

// Get CoverImage URL (if any)
function getCoverUrl(cover: string | null | undefined): string | null {
    return cover ? buildAssetUrl(cover) : null;
}

// Get BackgroundImage URL (if any)
function getBgUrl(bg: string | null | undefined): string | null {
    return bg ? buildAssetUrl(bg) : null;
}

// Load and process the full library data
async function loadLibrary(): Promise<LoadedData> {
    // load raw data
    const games = await loadDbCollection<Game>(COLLECTIONS.games);
    const tags = await loadDbCollection<Tag>(COLLECTIONS.tags);
    const sources = await loadDbCollection<Source>(COLLECTIONS.sources);
    const series = await loadDbCollection<Series>(COLLECTIONS.series);

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
        const title = getGameTitle(g.Name);
        const sortingName = getSortingName(g.SortingName, g.Name);
        const source = pickPrimarySourceName(g, sourceById);
        const year = pickYear(g.ReleaseYear, g.ReleaseDate);
        const tags = expandTagNames(g.TagIds, tagById);
        const isHidden = getIsHidden(g.Hidden);
        const link = getEffectiveLink(g.Links, g.Name, source, title, tags);
        const iconUrl = pickIconUrl(g.Icon);
        const isInstalled = getInstalled(g.Id, isInstalledSet);
        const series = expandSeriesNames(g.SeriesIds, seriesById);
        const coverUrl = getCoverUrl(g.CoverImage);
        const bgUrl = getBgUrl(g.BackgroundImage);

        return {
            id, gameId, title, sortingName, source, tags,
            series, isHidden, link, iconUrl, year,
            isInstalled, coverUrl, bgUrl,
        };
    });

    // all unique sources/tags/series (alphabetically sorted)
    const allSources = Array.from(new Set(items.map((r) => r.source).filter(Boolean))).sort();
    const allTags = Array.from(new Set(items.flatMap((r) => r.tags).filter(Boolean))).sort();
    const allSeries = Array.from(new Set(items.flatMap((r) => r.series).filter(Boolean))).sort();

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
