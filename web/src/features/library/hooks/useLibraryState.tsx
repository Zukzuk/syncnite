import * as React from "react";
import type { SortKey, SortDir, GameItem, ItemGroupedByLetter, UIState, UIDerivedState } from "../../../types/types";
import { loadStateFromCookie, orderedLetters, saveStateToCookie } from "../../../lib/utils";

type UseParams = {
  items: GameItem[];
};

type UseReturn = {
  ui: UIState;
  derived: UIDerivedState;
};

// A hook to manage library state including filtering, sorting, and persistence.
export function useLibraryState({ items }: UseParams): UseReturn {
  const cookieState = React.useMemo(loadStateFromCookie, []);
  const [q, setQ] = React.useState<string>(cookieState.q);
  const [sources, setSources] = React.useState<string[]>(cookieState.sources);
  const [tags, setTags] = React.useState<string[]>(cookieState.tags);
  const [series, setSeries] = React.useState<string[]>(cookieState.series);
  const [showHidden, setShowHidden] = React.useState<boolean>(cookieState.showHidden);
  const [sortKey, setSortKey] = React.useState<SortKey>(cookieState.sortKey);
  const [sortDir, setSortDir] = React.useState<SortDir>(cookieState.sortDir);
  const [installedOnly, setInstalledOnly] = React.useState<boolean>(cookieState.installedOnly);

  React.useEffect(() => {
    const toSave = { q, sources, tags, series, showHidden, installedOnly, sortKey, sortDir };
    saveStateToCookie(toSave);
  }, [q, sources, tags, series, showHidden, installedOnly, sortKey, sortDir]);

  const onToggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filteredSorted = React.useMemo(() => {
    const qv = q.toLowerCase().trim();

    const pass = items.filter((r) =>
      // sources: match any of selected
      (!sources.length || sources.includes(r.source)) &&
      // tags/series: match any of selected
      (!tags.length || tags.some((t) => r.tags?.includes(t))) &&
      // series: match any of selected
      (!series.length || series.some((t) => r.series?.includes(t))) &&
      // text search across title, source, tags
      (!qv || (r.title?.toLowerCase().includes(qv) || r.source?.toLowerCase().includes(qv) || r.tags?.some((t) => t.toLowerCase().includes(qv)))) &&
      // installed/hidden flags
      (!installedOnly || !!r.isInstalled) &&
      // hidden
      (showHidden || !r.isHidden)
    );

    // helpers to rank empties last regardless of direction
    const strKey = (s: string | null | undefined) => {
      const v = (s ?? "").trim().toLowerCase();
      return { empty: v.length === 0, v };
    };
    const arrKey = (a: string[] | null | undefined) => {
      const empty = !a || a.length === 0;
      return { empty, v: empty ? "" : a.join(",").toLowerCase() };
    };
    const yearKey = (y: number | null | undefined) => {
      const empty = typeof y !== "number";
      // keep numeric for comparisons; value only used when !empty
      return { empty, n: empty ? 0 : y as number };
    };
    const titleKey = (r: GameItem) => strKey(r.sortingName || r.title);

    pass.sort((a, b) => {
      // Choose primary key
      if (sortKey === "year") {
        const ka = yearKey(a.year), kb = yearKey(b.year);
        if (ka.empty !== kb.empty) return ka.empty ? 1 : -1; // empties last
        if (!ka.empty && !kb.empty) {
          if (ka.n < kb.n) return sortDir === "asc" ? -1 : 1;
          if (ka.n > kb.n) return sortDir === "asc" ? 1 : -1;
        }
        // tie-breaker by title (empties last)
        const ta = titleKey(a), tb = titleKey(b);
        if (ta.empty !== tb.empty) return ta.empty ? 1 : -1;
        return sortDir === "asc" ? ta.v.localeCompare(tb.v) : tb.v.localeCompare(ta.v);
      }

      const pickKey = () => {
        if (sortKey === "title") return titleKey;
        if (sortKey === "source") return (r: GameItem) => strKey(r.source);
        if (sortKey === "tags") return (r: GameItem) => arrKey(r.tags);
        if (sortKey === "series") return (r: GameItem) => arrKey(r.series);
        return titleKey;
      };

      const ka = pickKey()(a);
      const kb = pickKey()(b);

      // empties last for strings/arrays
      if (ka.empty !== kb.empty) return ka.empty ? 1 : -1;

      // compare values in requested direction
      const av = (ka as any).v ?? "";
      const bv = (kb as any).v ?? "";
      if (av !== bv) return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);

      // final tie-breaker: title (empties last)
      const ta = titleKey(a), tb = titleKey(b);
      if (ta.empty !== tb.empty) return ta.empty ? 1 : -1;
      return sortDir === "asc" ? ta.v.localeCompare(tb.v) : tb.v.localeCompare(ta.v);
    });

    return pass;
  }, [q, sources, tags, series, showHidden, installedOnly, sortKey, sortDir, items]);

  return {
    ui: {
      q, setQ,
      sources, setSources,
      tags, setTags,
      series, setSeries,
      showHidden, setShowHidden,
      sortKey, sortDir, setSortKey, onToggleSort,
      installedOnly, setInstalledOnly,
    },
    derived: {
      filteredCount: filteredSorted.length,
      totalCount: items.length,
      itemsSorted: filteredSorted,
      itemsGroupedByLetter: filteredSorted.map(
        (item) => ({ item, itemLetter: orderedLetters(item.title, item.sortingName) })
      ),
    },
  };
}
