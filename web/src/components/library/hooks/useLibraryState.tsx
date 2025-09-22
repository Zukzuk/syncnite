import * as React from "react";
import type { SortKey, SortDir, Persisted, Loaded } from "../../../lib/types";
import { bucketLetter } from "../../../lib/utils";
import { loadStateFromCookie, saveStateToCookie } from "../../../lib/persist";

export function useLibraryState(data: Loaded) {
  const persisted = React.useMemo(loadStateFromCookie, []);

  const [q, setQ] = React.useState<string>(persisted.q);
  const [sources, setSources] = React.useState<string[]>(persisted.sources);
  const [tags, setTags] = React.useState<string[]>(persisted.tags);
  const [showHidden, setShowHidden] = React.useState<boolean>(persisted.showHidden);
  const [sortKey, setSortKey] = React.useState<SortKey>(persisted.sortKey);
  const [sortDir, setSortDir] = React.useState<SortDir>(persisted.sortDir);
  const [installedOnly, setInstalledOnly] = React.useState<boolean>(persisted.installedOnly);

  React.useEffect(() => {
    const toSave: Persisted = { q, sources, tags, showHidden, installedOnly, sortKey, sortDir };
    saveStateToCookie(toSave);
  }, [q, sources, tags, showHidden, installedOnly, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filteredSorted = React.useMemo(() => {
    const qv = q.toLowerCase().trim();

    const pass = data.rows.filter((r) =>
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
  }, [q, sources, tags, showHidden, installedOnly, sortKey, sortDir, data.rows]);

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
      totalCount: data.rows.length,
      rowsSorted: filteredSorted,
      withBuckets: filteredSorted.map(
        (row) => ({ row, bucket: bucketLetter(row.title, row.sortingName) })
      ),
    },
  };
}
