import * as React from "react";
import type { Game, GameJson, GameSourceJson, TagJson, SeriesJson, GameLink, GameReleaseDate } from "../../../types/playnite";
import { FILES } from "../../../lib/constants";
import { fetchUser, tryFetchJson, tryLoadMany } from "../../../lib/persist";
import { buildIconUrl, findSourcishLink, normalizePath, extractYear,
    sourcishLinkFallback, hasEmulatorTag, myAbandonwareLink, buildAssetUrl,
} from "../../../lib/utils";
import { useRefreshLibrary } from "./useRefreshLibrary";
import { useLocalInstalled } from "./useLocalInstalled";

export type LoadedData = {
    items: Item[];
    allSources: string[];
    allTags: string[];
    allSeries: string[];
};

export type Item = {
    id: string;
    title: string;
    sortingName: string | null;
    gameId: string | null;
    source: string;
    tags: string[];
    series: string[];
    isHidden: boolean;
    isInstalled: boolean;
    link: string | null;
    year: number | null;
    iconUrl: string | null;
    coverUrl: string | null;
    bgUrl: string | null;
};

type UseParams = { pollMs: number };

type UseReturn = {
    data: LoadedData | null;
    installedUpdatedAt: string | null;
};

function getPlayniteId(g: Game): string {
    return g.Id || g._id.$guid;
}

function getGameId(id: string | null | undefined): string | null {
    return id ? String(id) : null;
}

function getGameTitle(name: string | null | undefined): string {
    return name ?? "Untitled";
}

function getSortingName(sortingName: string | null | undefined, name: string | null | undefined): string {
    return sortingName ?? name ?? "";
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

// Prefer Icon (path) but fall back to Id (legacy)
function pickIconUrl(icon: string | null | undefined): string {
    const iconRel = normalizePath(icon ?? undefined);
    // buildIconUrl historically accepts either a path and/or an id—pass only path here
    return buildIconUrl(iconRel, null);
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

// Prefetch the local Installed.json (case-insensitive ids)
async function fetchInstalledList(email: string | null): Promise<Set<string> | null> {
    let localInstalledSet: Set<string> | null = null;
    if (email) {
        const localInstalled = await tryFetchJson(
            `/data/installed/${email.toLowerCase()}.Installed.json`
        );
        if (Array.isArray(localInstalled?.installed)) {
            localInstalledSet = new Set(
                localInstalled.installed.map((s: string) => String(s).toLowerCase())
            );
        }
    }
    return localInstalledSet;
}

function getInstalled(id: string, installedSet: Set<string> | null): boolean {
    return installedSet ? installedSet.has(id.toLowerCase()) : false;
}

// Get CoverImage URL (if any)
function getCoverUrl(cover: string | null | undefined): string | null {
    return cover ? buildAssetUrl(cover) : null;
}

// Get BackgroundImage URL (if any)
function getBgUrl(bg: string | null | undefined): string | null {
    return bg ? buildAssetUrl(bg) : null;
}

/** Load the library data */
export async function loadLibrary(): Promise<LoadedData> {
    // load raw data
    const games = await tryLoadMany<GameJson>(FILES.games, []);
    const tags = await tryLoadMany<TagJson>(FILES.tags, []);
    const sources = await tryLoadMany<GameSourceJson>(FILES.sources, []);
    const series = await tryLoadMany<SeriesJson>(FILES.series, []);

    // index maps (Id -> Name)
    const tagById = new Map<string, string>(tags.map((t) => [t.Id, t.Name]));
    const sourceById = new Map<string, string>(sources.map((s) => [s.Id, s.Name]));
    const seriesById = new Map<string, string>(series.map((s) => [s.Id, s.Name]));

    // Get the user's email
    const email = fetchUser();
    // prefetch installed set (case-insensitive ids)
    const isInstalledSet = await fetchInstalledList(email);

    // build items
    const items: Item[] = games.map((g) => {
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
            isInstalled, coverUrl, bgUrl
        };
    });

    // all unique sources/tags/series (alphabetically sorted)
    const allSources = Array.from(new Set(items.map((r) => r.source).filter(Boolean))).sort();
    const allTags = Array.from(new Set(items.flatMap((r) => r.tags).filter(Boolean))).sort();
    const allSeries = Array.from(new Set(items.flatMap((r) => r.series).filter(Boolean))).sort();

    return { items, allSources, allTags, allSeries };
}

/**
 * Unified source of truth for the library data.
 * - Loads games/tags/sources 1:1 (no shape coercions)
 * - Updates when /data/manifest.json changes
 * - Patches "installed" quickly when local Installed.json changes
 */
export function useLibrary({ pollMs }: UseParams): UseReturn {
    const [data, setData] = React.useState<LoadedData | null>(null);

    // external pollers
    const { version: libraryVersion } = useRefreshLibrary({ pollMs });
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
            const items = prev.items.map((r) => ({
                ...r,
                installed: installedSet.has(r.id.toLowerCase()),
            }));
            return { ...prev, items };
        });
    }, [installedUpdatedAt, installedSet]);

    return { data, installedUpdatedAt };
}
