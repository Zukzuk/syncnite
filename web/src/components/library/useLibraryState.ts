import * as React from "react";
import type { SortKey, SortDir, Persisted, Loaded } from "../../lib/types";
import { bucketLetter } from "../../lib/utils";

const COOKIE_NAME = "pn_library_ui_v2";

const DEFAULTS: Persisted = {
  q: "",
  sources: [],
  tags: [],
  showHidden: false,
  installedOnly: false,
  sortKey: "title",
  sortDir: "asc",
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
    return {
      ...DEFAULTS,
      ...parsed,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch {
    return DEFAULTS;
  }
}

function saveStateToCookie(s: Persisted) {
  writeCookie(COOKIE_NAME, JSON.stringify(s));
}

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
    const toSave: Persisted = {
      q, sources, tags, showHidden, installedOnly, sortKey, sortDir,
    };
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
      (!tags.length || tags.some((t) => r.tags.includes(t))) &&
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
        (row) => (
          { row, bucket: bucketLetter(row.title, row.sortingName) }
        )
      ),
    },
  };
}