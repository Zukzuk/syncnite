import * as React from "react";
import type { SortKey, SortDir } from "../../lib/types";
import type { Loaded } from "../../lib/data";

function bucketLetter(title: string, sortingName: string) {
  const s = (sortingName || title || "").trim();
  const ch = s.charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "@";
}

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
};

export function useLibraryState(data: Loaded) {
  const [q, setQ] = React.useState("");
  const [source, setSource] = React.useState<string | null>("");
  const [tag, setTag] = React.useState<string | null>("");
  const [showHidden, setShowHidden] = React.useState(false); // default OFF
  const [sortKey, setSortKey] = React.useState<SortKey>("title");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredSorted = React.useMemo(() => {
    const qv = q.toLowerCase().trim();
    const pass = data.rows.filter((r) =>
      (!source || r.source === source) &&
      (!tag || r.tags.includes(tag)) &&
      (showHidden || !r.hidden) &&
      (!qv ||
        r.title.toLowerCase().includes(qv) ||
        r.source.toLowerCase().includes(qv) ||
        r.tags.some((t) => t.toLowerCase().includes(qv)))
    );

    const sortVal = (r: typeof data.rows[number]) => {
      switch (sortKey) {
        case "title": return (r.sortingName || r.title).toLowerCase();
        case "source": return (r.source || "").toLowerCase();
        case "tags":   return r.tags.join(", ").toLowerCase();
      }
    };
    pass.sort((a, b) => {
      const av = sortVal(a), bv = sortVal(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return pass;
  }, [q, source, tag, showHidden, sortKey, sortDir, data.rows]);

  // Build buckets for alpha separators
  const withBuckets = React.useMemo(() => {
    return filteredSorted.map((row) => ({
      row,
      bucket: bucketLetter(row.title, row.sortingName),
    }));
  }, [filteredSorted]);

  return {
    ui: { q, setQ, source, setSource, tag, setTag, showHidden, setShowHidden, sortKey, sortDir, setSortKey, toggleSort },
    derived: {
      filteredCount: filteredSorted.length,
      totalCount: data.rows.length,
      withBuckets,
    },
  };
}
