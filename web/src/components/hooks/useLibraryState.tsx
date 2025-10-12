import * as React from "react";
import type { SortKey, SortDir } from "../../lib/types";
import { orderedLetters } from "../../lib/utils";
import { CookieState, loadStateFromCookie, saveStateToCookie } from "../../lib/persist";
import { Row } from "./useLibrary";

export type WithBucket = { 
  row: Row; 
  bucket: string 
};

type UseParams = {
  rows: Row[];
};

type UseReturn = {
  ui: {
    q: string;
    setQ: React.Dispatch<React.SetStateAction<string>>;
    sources: string[];
    setSources: React.Dispatch<React.SetStateAction<string[]>>;
    tags: string[];
    setTags: React.Dispatch<React.SetStateAction<string[]>>;
    showHidden: boolean;
    setShowHidden: React.Dispatch<React.SetStateAction<boolean>>;
    sortKey: SortKey;
    sortDir: SortDir;
    setSortKey: React.Dispatch<React.SetStateAction<SortKey>>;
    toggleSort: (key: SortKey) => void;
    installedOnly: boolean;
    setInstalledOnly: React.Dispatch<React.SetStateAction<boolean>>;
  };
  derived: {
    filteredCount: number;
    totalCount: number;
    rowsSorted: Row[];
    withBuckets: WithBucket[];
  };
};

export function useLibraryState({ rows }: UseParams): UseReturn {
  const cookieState = React.useMemo(loadStateFromCookie, []);
  const [q, setQ] = React.useState<string>(cookieState.q);
  const [sources, setSources] = React.useState<string[]>(cookieState.sources);
  const [tags, setTags] = React.useState<string[]>(cookieState.tags);
  const [showHidden, setShowHidden] = React.useState<boolean>(cookieState.showHidden);
  const [sortKey, setSortKey] = React.useState<SortKey>(cookieState.sortKey);
  const [sortDir, setSortDir] = React.useState<SortDir>(cookieState.sortDir);
  const [installedOnly, setInstalledOnly] = React.useState<boolean>(cookieState.installedOnly);

  React.useEffect(() => {
    const toSave: CookieState = { q, sources, tags, showHidden, installedOnly, sortKey, sortDir };
    saveStateToCookie(toSave);
  }, [q, sources, tags, showHidden, installedOnly, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filteredSorted = React.useMemo(() => {
    const qv = q.toLowerCase().trim();

    const pass = rows.filter((r) =>
      (!sources.length || sources.includes(r.source)) &&
      (!tags.length || tags.some((t) => r.tags?.includes(t))) &&
      (!qv || (r.title?.toLowerCase().includes(qv) || r.source?.toLowerCase().includes(qv) || r.tags?.some((t) => t.toLowerCase().includes(qv)))) &&
      (!installedOnly || !!r.installed) &&
      (showHidden || !r.hidden)
    );

    const sortVal = (r: (typeof pass)[number]) => {
      if (sortKey === "title") return (r.sortingName || r.title || "").toLowerCase();
      if (sortKey === "tags") return (r.tags?.join(",") || "").toLowerCase();
      if (sortKey === "source") return (r.source || "").toLowerCase();
      if (sortKey === "year") return r.year ?? -Infinity;
      return (r.sortingName || r.title || "").toLowerCase();
    };

    pass.sort((a, b) => {
      if (sortKey === "year") {
        const av = a.year ?? -Infinity;
        const bv = b.year ?? -Infinity;
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        const at = (a.sortingName || a.title).toLowerCase();
        const bt = (b.sortingName || b.title).toLowerCase();
        return at.localeCompare(bt);
      }
      const av = sortVal(a), bv = sortVal(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return pass;
  }, [q, sources, tags, showHidden, installedOnly, sortKey, sortDir, rows]);

  return {
    ui: {
      q, setQ,
      sources, setSources,
      tags, setTags,
      showHidden, setShowHidden,
      sortKey, sortDir, setSortKey, toggleSort,
      installedOnly, setInstalledOnly,
    },
    derived: {
      filteredCount: filteredSorted.length,
      totalCount: rows.length,
      rowsSorted: filteredSorted,
      withBuckets: filteredSorted.map(
        (row) => ({ row, bucket: orderedLetters(row.title, row.sortingName) })
      ),
    },
  };
}
