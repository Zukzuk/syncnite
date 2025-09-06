import * as React from "react";
import type { SortKey, SortDir } from "../../lib/types";
import type { Loaded } from "../../lib/data";
import { bucketLetter } from "../../lib/utils";

export type LibraryUiState = {
  q: string;
  setQ: (v: string) => void;
  source: string | null;
  setSource: (v: string | null) => void;
  tag: string | null;
  setTag: (v: string | null) => void;
  showHidden: boolean;
  setShowHidden: (v: boolean) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  setSortKey: (k: SortKey) => void;
  toggleSort: (k: SortKey) => void;
  installedOnly: boolean;
  setInstalledOnly: (v: boolean) => void;
};

export function useLibraryState(data: Loaded) {
  const [q, setQ] = React.useState("");
  const [source, setSource] = React.useState<string | null>("");
  const [tag, setTag] = React.useState<string | null>("");
  const [showHidden, setShowHidden] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<SortKey>("title");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [installedOnly, setInstalledOnly] = React.useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filteredSorted = React.useMemo(() => {
    const qv = q.toLowerCase().trim();
    const pass = data.rows.filter((r) =>
      (!source || r.source === source) &&
      (!tag || r.tags.includes(tag)) &&
      (showHidden || !r.hidden) &&
      (!installedOnly || r.installed) &&            // ← NEW
      (!qv ||
        r.title.toLowerCase().includes(qv) ||
        r.source.toLowerCase().includes(qv) ||
        (r.year != null && String(r.year).includes(qv)) ||
        r.tags.some((t) => t.toLowerCase().includes(qv))
      )
    );

    const sortVal = (r: typeof data.rows[number]) => {
      switch (sortKey) {
        case "title": return (r.sortingName || r.title).toLowerCase();
        case "source": return (r.source || "").toLowerCase();
        case "tags": return r.tags.join(", ").toLowerCase();
        case "year": return String(r.year ?? ""); // string compare but fine; or use a two-step numeric sort below
      }
    };

    pass.sort((a, b) => {
      if (sortKey === "year") {
        const av = a.year ?? -Infinity;
        const bv = b.year ?? -Infinity;
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        // tie-breaker by title
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
  }, [q, source, tag, showHidden, installedOnly, sortKey, sortDir, data.rows]);

  const withBuckets = React.useMemo(() => {
    return filteredSorted.map((row) => ({
      row,
      bucket: bucketLetter(row.title, row.sortingName),
    }));
  }, [filteredSorted]);

  return {
    ui: {
      q, setQ, source, setSource, tag, setTag, showHidden, setShowHidden,
      sortKey, sortDir, setSortKey, toggleSort,
      installedOnly, setInstalledOnly,
    },
    derived: {
      filteredCount: filteredSorted.length,
      totalCount: data.rows.length,
      rowsSorted: filteredSorted,
      withBuckets: filteredSorted.map((row) => ({ row, bucket: bucketLetter(row.title, row.sortingName) })),
    },
  };
}
