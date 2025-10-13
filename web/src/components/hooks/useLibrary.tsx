import * as React from "react";
import { FILES } from "../../lib/constants";
import { getEmail, tryFetchJson, tryLoadMany } from "../../lib/persist";
import {
    buildIconUrl, findSourcishLink, normalizePath,
    extractYear, sourcishLinkFallback,
} from "../../lib/utils";
import { useRefreshLibrary } from "./useRefreshLibrary";
import { useLocalInstalled } from "./useLocalInstalled";
import type { Game, GameJson, GameSourceJson, TagJson } from "../../types/playnite";

export type LoadedData = {
    rows: Row[];
    allSources: string[];
    allTags: string[];
};

export type Row = {
    id: string;
    gameId: string | null;
    title: string;
    sortingName: string;
    source: string;
    tags: string[];
    hidden: boolean;
    url: string | null;
    iconUrl: string;
    year?: number | null;
    raw: Game;
    installed: boolean;
};

type UseParams = { pollMs: number };

type UseReturn = {
    data: LoadedData | null;
    installedUpdatedAt: string | null;
};

// Prefer explicit ReleaseYear, otherwise derive from ReleaseDate.ReleaseDate ("yyyy-mm-dd")
function pickYear(g: Game): number | null {
    if (typeof g.ReleaseYear === "number") return g.ReleaseYear;
    const iso = g.ReleaseDate?.ReleaseDate;
    if (typeof iso === "string") {
        const y = extractYear(iso);
        return typeof y === "number" ? y : null;
    }
    return null;
}

function pickIconUrl(g: Game): string {
    const iconRel = normalizePath(g.Icon ?? undefined);
    // buildIconUrl historically accepts either a path and/or an id—pass only path here
    return buildIconUrl(iconRel, null);
}

function pickPrimarySourceName(g: Game, sourceById: Map<string, string>): string {
    const id = g.SourceId ?? null;
    const name = id ? sourceById.get(id) ?? "" : "";
    return name.toLowerCase().trim();
}

function expandTagNames(ids: string[] | undefined, tagById: Map<string, string>): string[] {
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => tagById.get(id)).filter(Boolean) as string[];
}

export async function loadLibrary(): Promise<LoadedData> {
    const games = await tryLoadMany<GameJson>(FILES.games, []);
    const tags = await tryLoadMany<TagJson>(FILES.tags, []);
    const sources = await tryLoadMany<GameSourceJson>(FILES.sources, []);

    // index maps (Id -> Name)
    const tagById = new Map<string, string>(tags.map((t) => [t.Id, t.Name]));
    const sourceById = new Map<string, string>(sources.map((s) => [s.Id, s.Name]));

    // best-effort local Installed set for initial paint
    const email = getEmail();
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

    // build rows
    const rows: Row[] = games.map((g) => {
        const id = g.Id;
        const gameId = g.GameId ? String(g.GameId) : null;
        const title = g.Name ?? "Untitled";
        const sortingName = g.SortingName ?? g.Name ?? ""
        const source = pickPrimarySourceName(g, sourceById);
        const year = pickYear(g);
        const tags = expandTagNames(g.TagIds, tagById);
        const hidden = !!g.Hidden;
        let url = findSourcishLink(g.Links, source);
        if (!url && source) url = sourcishLinkFallback(source, g.Name ?? "");
        const iconUrl = pickIconUrl(g);
        const installed = localInstalledSet ? localInstalledSet.has(id.toLowerCase()) : false;
        return {
            id, gameId, title, sortingName, source, tags,
            hidden, url, iconUrl, year, installed, raw: g,
        };
    });

    // all unique sources (sorted)
    const allSources = Array.from(new Set(rows.map((r) => r.source).filter(Boolean))).sort();

    // all unique tags (sorted)
    const allTags = Array.from(new Set(rows.flatMap((r) => r.tags).filter(Boolean))).sort();

    return { rows, allSources, allTags };
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
            const rows = prev.rows.map((r) => ({
                ...r,
                installed: installedSet.has(r.id.toLowerCase()),
            }));
            return { ...prev, rows };
        });
    }, [installedUpdatedAt, installedSet]);

    return { data, installedUpdatedAt };
}
