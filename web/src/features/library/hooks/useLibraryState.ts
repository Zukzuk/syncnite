import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "@mantine/hooks";
import type { SortKey, SortDir, UIControls, UIDerivedData, ViewMode, SwitchesMode } from "../../../types/app";
import { InterLinkedGameItem } from "../../../types/interlinked";
import { orderedLetters } from "../../../utils";
import { sortItems } from "../../../services/SearchService";
import { loadStateFromCookie, saveStateToCookie } from "../../../services/AccountService";

type UseParams = InterLinkedGameItem[];

type UseReturn = {
  uiControls: UIControls;
  derivedData: UIDerivedData;
};

// A hook to manage library state including filtering, sorting, and persistence.
export function useLibraryState(items: UseParams): UseReturn {
  const cookieState = useMemo(loadStateFromCookie, []);

  const [q, setQ] = useState<string>(cookieState.q);
  const [sources, setSources] = useState<string[]>(cookieState.sources);
  const [tags, setTags] = useState<string[]>(cookieState.tags);
  const [series, setSeries] = useState<string[]>(cookieState.series);
  const [showHidden, setShowHidden] = useState<boolean>(cookieState.showHidden);
  const [installedOnly, setShowInstalledOnly] = useState<boolean>(cookieState.installedOnly);
  const [sortKey, setSortKey] = useState<SortKey>(cookieState.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>(cookieState.sortDir);

  const [sliderValue, setSliderValue] = useState(cookieState.sliderValue);

  const [view, setView] = useLocalStorage<ViewMode>({
    key: "library.view",
    defaultValue: "grid", // optional: your preferred default
    getInitialValueInEffect: false, // no first-render mismatch
  });
  const isListView = view === "list";

  const [switches, setSwitches] = useLocalStorage<SwitchesMode>({
    key: "library.switches",
    defaultValue: "enabled",
    getInitialValueInEffect: false,
  });

  const resetAllFilters = useCallback(() => {
    setQ("");
    setTags([]);
    setSources([]);
    setSeries([]);
    setShowInstalledOnly(false);
    setShowHidden(false);
  }, [
    setQ,
    setTags,
    setSources,
    setSeries,
    setShowInstalledOnly,
    setShowHidden,
  ]);

  useEffect(() => {
    const toSave = { q, sliderValue, sources, tags, series, showHidden, installedOnly, sortKey, sortDir };
    saveStateToCookie(toSave);
  }, [q, sliderValue, sources, tags, series, showHidden, installedOnly, sortKey, sortDir]);

  const onToggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const itemsAssociated = useMemo(() => {
    const pass = items.filter((r) =>
      // hidden
      (showHidden || !r.isHidden)
    );

    return sortItems(pass, sortKey, sortDir);
  }, [q, sources, tags, series, showHidden, installedOnly, sortKey, sortDir, items]);

  const itemsSorted = useMemo(() => {
    const qv = q.toLowerCase().trim();

    const pass = items.filter((r) =>
      // text search 
      (!qv || (
        r.title.toLowerCase().includes(qv) ||
        r.sortingName?.toLowerCase().includes(qv) ||
        r.version?.toLowerCase().includes(qv) ||
        r.searchableDescription?.toLowerCase().includes(qv) ||
        r.tags?.some((ta) => ta.toLowerCase().includes(qv)) ||
        r.series?.some((se) => se.toLowerCase().includes(qv))
      )) &&
      // sources: match any of selected
      (!sources.length || sources.some((so) => r.source === so)) &&
      // tags: match any of selected
      (!tags.length || tags.some((ta) => r.tags?.includes(ta))) &&
      // series: match any of selected
      (!series.length || series.some((se) => r.series?.includes(se))) &&
      // installed flags
      (!installedOnly || !!r.isInstalled) &&
      // hidden flags
      (showHidden || !r.isHidden)
    );

    return sortItems(pass, sortKey, sortDir);
  }, [q, sources, tags, series, showHidden, installedOnly, sortKey, sortDir, items]);

  const filteredCount = itemsSorted.length;
  const totalCount = items.length;
  const itemsGroupedByLetter = itemsSorted.map(
    (item) => ({ item, itemLetter: orderedLetters(item.title, item.sortingName) })
  );

  return {
    uiControls: {
      view, setView, isListView,
      switches, setSwitches, resetAllFilters,
      sliderValue, setSliderValue,
      q, setQ,
      sources, setSources,
      tags, setTags,
      series, setSeries,
      showHidden, setShowHidden,
      sortKey, sortDir, setSortKey, onToggleSort,
      installedOnly, setShowInstalledOnly,
    },
    derivedData: {
      filteredCount,
      totalCount,
      itemsAssociated,
      itemsSorted,
      itemsGroupedByLetter,
    },
  };
}
