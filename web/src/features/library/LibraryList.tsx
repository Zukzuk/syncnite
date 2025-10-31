import React from "react";
import { Box, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { ViewMode } from "../../lib/types";
import { GRID } from "../../lib/constants";
import { RailWrapper } from "./RailWrapper";
import { ListGrouped } from "./ListGrouped";
import { ListFlat } from "./ListFlat";
import { HeaderControls } from "./HeaderControls";
import { HeaderSort } from "./HeaderSort";
import { useLibraryState } from "./hooks/useLibraryState";
import { useAlphabetGroups } from "./hooks/useAlphabetGroups";
import { useAlphabetRail } from "./hooks/useAlphabetRail";
import { useCollapseOpenToggle } from "./hooks/useCollapseOpenToggle";
import { useListJumpToScroll } from "./hooks/useListJumpToScroll";
import { useRemountKeys } from "./hooks/useRemountKeys";
import { LoadedData } from "./hooks/useLibrary";

type Props = {
  data: LoadedData;
  onCountsChange?: (filtered: number, total: number) => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  filteredCount: number;
  totalCount: number;
  installedUpdatedAt?: string;
};

export default function LibraryList({
  data,
  onCountsChange,
  view,
  setView,
  filteredCount,
  totalCount,
  installedUpdatedAt,
}: Props) {
  const overscan = { top: 600, bottom: 800 } as const;
  const { ui, derived } = useLibraryState(data);
  const { ref: controlsRef, height: controlsH } = useElementSize();
  const { ref: headerRef, height: headerH } = useElementSize();
  const { openIds, everOpenedIds, toggleOpen } = useCollapseOpenToggle();
  const { virtuosoRef, setScrollerEl, scrollRowIntoView } = useListJumpToScroll({ headerH });

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
    itemsSorted: derived.itemsSorted,
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
      <HeaderControls
        controlsRef={controlsRef as unknown as (el: HTMLElement | null) => void}
        filteredCount={filteredCount}
        totalCount={totalCount}
        allSources={data.allSources}
        allTags={data.allTags}
        allSeries={data.allSeries}
        view={view}
        setView={setView}
        {...ui}
      />

      <HeaderSort
        headerRef={headerRef as unknown as (el: HTMLElement | null) => void}
        sortKey={ui.sortKey}
        sortDir={ui.sortDir}
        onToggleSort={ui.toggleSort}
        gridColumns={GRID.colsList}
      />

      <Box style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {isGrouped && groups ? (
          <ListGrouped
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
          <ListFlat
            virtuosoRef={virtuosoRef}
            scrollerRef={setScrollerEl}
            items={derived.itemsSorted}
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

        <RailWrapper
          isVisible={!!isGrouped}
          activeLetter={activeLetter}
          counts={counts}
          onJump={handleJump}
        />
      </Box>
    </Flex>
  );
}
