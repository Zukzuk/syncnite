import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "@mantine/hooks";
import type { SortKey, SortDir, UIControls, UIDerivedData, ViewMode, SwitchesMode } from "../../../types/app";
import type { InterLinkedItem, InterLinkedData } from "../../../types/interlinked";
import { orderedLetters } from "../../../utils";
import { loadStateFromCookie, saveStateToCookie } from "../../../services/AccountService";
import { getSourceKey, isInstalled, matchesQuery, sortItems } from "../../../services/SearchService";

type UseParams = InterLinkedData;

type UseReturn = {
  uiControls: UIControls;
  derivedData: UIDerivedData;
};

export function useLibraryState(libraryData: UseParams): UseReturn {
  const items: InterLinkedItem[] = useMemo(
    () => Object.values(libraryData).flatMap((o) => o?.items ?? []),
    [libraryData]
  );

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
    defaultValue: "grid",
    getInitialValueInEffect: false,
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
  }, []);

  useEffect(() => {
    const toSave = { q, sliderValue, sources, tags, series, showHidden, installedOnly, sortKey, sortDir };
    saveStateToCookie(toSave);
  }, [q, sliderValue, sources, tags, series, showHidden, installedOnly, sortKey, sortDir]);

  const onToggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ✅ single predicate reused everywhere
  const matches = useMemo(() => {
    return (r: InterLinkedItem) =>
      matchesQuery(r, q) &&
      (!sources.length || sources.includes(getSourceKey(r))) &&
      (!tags.length || tags.some((ta) => r.tags?.includes(ta))) &&
      (!series.length || series.some((se) => r.series?.includes(se))) &&
      (!installedOnly || isInstalled(r)) &&
      (showHidden || !r.isHidden);
  }, [q, sources, tags, series, installedOnly, showHidden]);

  const itemsAssociated = useMemo(() => {
    // associated ignores everything except hidden (as you had)
    const pass = items.filter((r) => showHidden || !r.isHidden);
    return sortItems(pass, sortKey, sortDir);
  }, [items, showHidden, sortKey, sortDir]);

  const itemsSorted = useMemo(() => {
    const pass = items.filter(matches);
    return sortItems(pass, sortKey, sortDir);
  }, [items, matches, sortKey, sortDir]);

  const filteredCount = itemsSorted.length;
  const totalCount = items.length;

  const itemsGroupedByLetter = useMemo(
    () => itemsSorted.map((item) => ({ item, itemLetter: orderedLetters(item.title, item.sortingName) })),
    [itemsSorted]
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
