import * as React from "react";
import type { SortKey, SortDir } from "../../lib/types";
import type { Loaded } from "../../lib/data";
import { bucketLetter } from "../../lib/utils";

// --- Cookie helpers ---
const COOKIE_NAME = "pn_library_ui_v1";
type Persisted = {
  q: string;
  source: string | null;
  tag: string | null;
  showHidden: boolean;
  installedOnly: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  _v: number; // schema version
};
const DEFAULTS: Persisted = {
  q: "",
  source: null,
  tag: null,
  showHidden: false,
  installedOnly: false,
  sortKey: "title",
  sortDir: "asc",
  _v: 1,
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 180) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}
function loadStateFromCookie(): Persisted {
  try {
    const raw = readCookie(COOKIE_NAME);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    // basic validation + defaults
    return {
      ...DEFAULTS,
      ...parsed,
      // coerce empty strings to null for selects
      source: parsed?.source ?? null,
      tag: parsed?.tag ?? null,
      _v: 1,
    };
  } catch {
    return DEFAULTS;
  }
}
function saveStateToCookie(s: Persisted) {
  writeCookie(COOKIE_NAME, JSON.stringify(s));
}
// --- end cookie helpers ---

export type LibraryUiState = {
  q: string; setQ: (v: string) => void;
  source: string | null; setSource: (v: string | null) => void;
  tag: string | null; setTag: (v: string | null) => void;
  showHidden: boolean; setShowHidden: (v: boolean) => void;
  sortKey: SortKey; sortDir: SortDir; setSortKey: (k: SortKey) => void; toggleSort: (k: SortKey) => void;
  installedOnly: boolean; setInstalledOnly: (v: boolean) => void;
};

export function useLibraryState(data: Loaded) {
  // init from cookie once
  const persisted = React.useMemo(loadStateFromCookie, []);

  const [q, setQ] = React.useState<string>(persisted.q);
  const [source, setSource] = React.useState<string | null>(persisted.source);
  const [tag, setTag] = React.useState<string | null>(persisted.tag);
  const [showHidden, setShowHidden] = React.useState<boolean>(persisted.showHidden);
  const [sortKey, setSortKey] = React.useState<SortKey>(persisted.sortKey);
  const [sortDir, setSortDir] = React.useState<SortDir>(persisted.sortDir);
  const [installedOnly, setInstalledOnly] = React.useState<boolean>(persisted.installedOnly);

  // persist on any change
  React.useEffect(() => {
    const toSave: Persisted = {
      q, source, tag, showHidden, installedOnly, sortKey, sortDir, _v: 1,
    };
    saveStateToCookie(toSave);
  }, [q, source, tag, showHidden, installedOnly, sortKey, sortDir]);

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
      (!installedOnly || r.installed) &&
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
        case "year": return String(r.year ?? ""); 
      }
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
