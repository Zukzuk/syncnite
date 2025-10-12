import * as React from "react";
import { FILES } from "../../lib/constants";
import { getEmail, tryFetchJson, tryLoadMany } from "../../lib/persist";
import {
    buildIconUrl, firstStoreishLink,
    normalizePath, extractYear, sourceUrlFallback
} from "../../lib/utils";
import { useRefreshLibrary } from "./useRefreshLibrary";
import { useLocalInstalled } from "./useLocalInstalled";

type Guidish =
    | string
    | { $guid?: string }
    | { $oid?: string }
    | { Guid?: string }
    | { Value?: string }
    | null
    | undefined;

export type Link = {
    Name?: string;
    Url?: string;
};

type GameDoc = {
    _id?: Guidish;
    Id?: Guidish;
    Name?: string;
    TagIds?: Guidish[];
    SourceId?: Guidish;
    Hidden?: boolean;
    GameId?: string | number;
    Links?: Link[];
    Icon?: string;
    IconId?: Guidish;
    IsInstalled?: boolean;
};

type NamedDoc = {
    _id?: Guidish;
    Id?: Guidish;
    Name?: string
};

export type LoadedData = {
    rows: Row[];
    allSources: string[];
    allTags: string[]
};

export type Row = {
    id: string;
    title: string;
    sortingName: string;
    source: string;
    tags: string[];
    hidden: boolean;
    url: string | null;
    iconUrl: string;
    year?: number | null;
    raw: GameDoc;
    installed: boolean;
};

type UseParams = {
    pollMs: number;
};

type UseReturn = {
    data: LoadedData | null;
    installedUpdatedAt: string | null;
};

const asGuid = (v: Guidish): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  const obj = v as Record<string, unknown>;
  for (const key of ["$guid", "$oid", "Guid", "Value"]) {
    const val = obj[key];
    if (typeof val === "string" && val.length) return val;
  }
  return null;
};

const asGuidArray = (arr: Guidish[] | undefined): string[] =>
  Array.isArray(arr) ? (arr.map(asGuid).filter(Boolean) as string[]) : [];

export async function loadLibrary(): Promise<{
    rows: Row[], allSources: string[], allTags: string[]
}> {
    const games = await tryLoadMany<GameDoc[]>(FILES.games, []);
    const tags = await tryLoadMany<NamedDoc[]>(FILES.tags, []);
    const sources = await tryLoadMany<NamedDoc[]>(FILES.sources, []);

    // best-effort local Installed set for initial paint
    const email = getEmail();
    let localInstalledSet: Set<string> | null = null;
    if (email) {
        const localInstalled = await tryFetchJson(`/data/installed/${email.toLowerCase()}.Installed.json`);
        if (Array.isArray(localInstalled?.installed)) {
            localInstalledSet = new Set(localInstalled.installed.map((s: string) => String(s).toLowerCase()));
        }
    }

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
        const installed = localInstalledSet ? localInstalledSet.has(id.toLowerCase()) : false;

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
            raw: g,
        };
    });

    const allSources = Array.from(new Set(rows.map(r => r.source).filter(Boolean))).sort();
    const allTags = Array.from(new Set(rows.flatMap(r => r.tags).filter(Boolean))).sort();

    return { rows, allSources, allTags };
}


/**
 * Unified source of truth for the library data.
 * - Loads & normalizes games/tags/sources
 * - Updates when /data/manifest.json changes
 * - Patches "installed" flags quickly when local Installed.json changes
 */
export function useLibrary({ pollMs }: UseParams): UseReturn {
    const [data, setData] = React.useState<{ rows: Row[], allSources: string[], allTags: string[] } | null>(null);

    // external pollers
    const { version: libraryVersion } = useRefreshLibrary({ pollMs });
    const { set: installedSet, updatedAt: installedUpdatedAt } = useLocalInstalled({ pollMs });

    // one-shot (re)load when manifest changes
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            const fresh = await loadLibrary();
            if (!cancelled) setData(fresh);
        })();
        return () => { cancelled = true; };
    }, [libraryVersion]);

    // fast "installed" patch when local installed changes
    React.useEffect(() => {
        if (!installedSet || !installedUpdatedAt) return;
        setData(prev => {
            if (!prev) return prev;
            const rows = prev.rows.map(r => ({
                ...r,
                installed: installedSet.has(r.id.toLowerCase()),
            }));
            return { ...prev, rows };
        });
    }, [installedUpdatedAt, installedSet]);

    return { data, installedUpdatedAt };
}