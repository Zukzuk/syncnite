import React from "react";
import { Box, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { StickyControls } from "./StickyControls";
import { StickySort } from "./StickySort";
import { AlphabetRailOverlay } from "./RailOverlay";
import { GroupedList } from "./GroupedList";
import { FlatList } from "./FlatList";
import { useLibraryState } from "../hooks/useLibraryState";
import { useAlphabetGroups } from "../hooks/useAlphabetGroups";
import { useAlphabetRail } from "../hooks/useAlphabetRail";
import { useCollapseOpenToggle } from "../hooks/useCollapseOpenToggle";
import { useJumpToScroll } from "../hooks/useJumpToScroll";
import { useRemountKeys } from "../hooks/useRemountKeys";
import { LoadedData } from "../hooks/useLibrary";

type Props = {
  data: LoadedData;
  onCountsChange?: (filtered: number, total: number) => void;
  filteredCount: number;
  totalCount: number;
  installedUpdatedAt?: string;
};

export function LibraryList({
  data,
  onCountsChange,
  filteredCount,
  totalCount,
  installedUpdatedAt,
}: Props) {
  const overscan = { top: 600, bottom: 800 } as const;
  const { ui, derived } = useLibraryState(data);
  const { ref: controlsRef, height: controlsH } = useElementSize();
  const { ref: headerRef, height: headerH } = useElementSize();
  const { openIds, everOpenedIds, toggleOpen } = useCollapseOpenToggle();
  const { virtuosoRef, setScrollerEl, scrollRowIntoView } = useJumpToScroll({ headerH });

  React.useEffect(() => {
    onCountsChange?.(derived.filteredCount, derived.totalCount);
  }, [derived.filteredCount, derived.totalCount, onCountsChange]);

  const onToggleGrouped = React.useCallback(
    (id: string, globalIndex: number) => {
      toggleOpen(id, () => requestAnimationFrame(() => scrollRowIntoView(globalIndex, true)));
    },
    [toggleOpen, scrollRowIntoView]
  );

  const onToggleFlat = React.useCallback(
    (id: string, index: number) => {
      toggleOpen(id, () => requestAnimationFrame(() => scrollRowIntoView(index, false)));
    },
    [toggleOpen, scrollRowIntoView]
  );

  const { groups, isGrouped, flatItems } = useAlphabetGroups({
    sortKey: ui.sortKey,
    withBuckets: derived.withBuckets,
    rowsSorted: derived.rowsSorted,
  });

  const { counts, activeLetter, handleJump, rangeChanged } = useAlphabetRail(
    { isGrouped, groups, flatItems, virtuosoRef }
  );

  const { groupedKey, flatKey } = useRemountKeys({
    filteredCount: derived.filteredCount,
    q: ui.q,
    sources: ui.sources,
    tags: ui.tags,
    series: ui.series,
    showHidden: ui.showHidden,
    installedOnly: ui.installedOnly,
    sortKey: ui.sortKey,
    sortDir: ui.sortDir,
  });

  return (
    <Flex direction="column" h="100%" style={{ minHeight: 0 }}>
      <StickyControls
        controlsRef={controlsRef as unknown as (el: HTMLElement | null) => void}
        filteredCount={filteredCount}
        totalCount={totalCount}
        ui={{ ...ui, allSources: data.allSources, allTags: data.allTags, allSeries: data.allSeries }}
      />

      <StickySort
        headerRef={headerRef as unknown as (el: HTMLElement | null) => void}
        top={controlsH}
        sortKey={ui.sortKey}
        sortDir={ui.sortDir}
        onToggleSort={ui.toggleSort}
      />

      <Box style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {isGrouped && groups ? (
          <GroupedList
            virtuosoRef={virtuosoRef}
            scrollerRef={setScrollerEl}
            groups={groups}
            topOffset={controlsH + headerH}
            overscan={overscan}
            rangeChanged={rangeChanged}
            openIds={openIds}
            everOpenedIds={everOpenedIds}
            onToggle={onToggleGrouped}
            remountKey={groupedKey}
            installedUpdatedAt={installedUpdatedAt}
          />
        ) : (
          <FlatList
            virtuosoRef={virtuosoRef}
            scrollerRef={setScrollerEl}
            rows={derived.rowsSorted}
            topOffset={controlsH + headerH}
            overscan={overscan}
            rangeChanged={rangeChanged}
            openIds={openIds}
            everOpenedIds={everOpenedIds}
            onToggle={onToggleFlat}
            remountKey={flatKey}
            installedUpdatedAt={installedUpdatedAt}
          />
        )}

        <AlphabetRailOverlay
          isVisible={!!isGrouped}
          activeLetter={activeLetter}
          counts={counts}
          onJump={handleJump}
        />
      </Box>
    </Flex>
  );
}
