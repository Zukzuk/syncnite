import React from "react";
import { Box, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { Virtuoso, GroupedVirtuoso, VirtuosoHandle } from "react-virtuoso";
import type { Loaded } from "../../lib/types";
import { ControlsHeader } from "./ControlsHeader";
import { GameRow } from "./GameRow";
import { AlphabeticalSeparatorRow } from "./AlphabeticalSeparatorRow";
import { SortHeader } from "./SortHeader";
import { AlphabeticalRail } from "./AlphabeticalRail";
import { useAlphabetGroups } from "./hooks/useAlphabetGroups";
import { useAlphabetRail } from "./hooks/useAlphabetRail";
import { useLibraryState } from "./hooks/useLibraryState";

import "./LibraryList.scss";

const Scroller = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  (props, ref) => (
    <div
      {...props}
      ref={ref}
      style={{
        ...props.style,
        overflowY: "scroll",
        scrollbarGutter: "stable both-edges",
      }}
    />
  )
);
Scroller.displayName = "Scroller";

export function LibraryList({
  data,
  onCountsChange,
  filteredCount,
  totalCount,
}: {
  data: Loaded;
  onCountsChange?: (filtered: number, total: number) => void;
  filteredCount: number;
  totalCount: number;
}) {
  const { ui, derived } = useLibraryState(data);
  const { ref: controlsRef, height: controlsH } = useElementSize();
  const { ref: headerRef, height: headerH } = useElementSize();

  const virtuosoRef = React.useRef<VirtuosoHandle>(null);

  React.useEffect(() => {
    onCountsChange?.(derived.filteredCount, derived.totalCount);
  }, [derived.filteredCount, derived.totalCount, onCountsChange]);

  // Alphabet grouping is encapsulated here
  const { groups, isGrouped, flatItems } = useAlphabetGroups(
    ui.sortKey,
    derived.withBuckets,
    derived.rowsSorted
  );

  // Rail logic is fully encapsulated here
  const { counts, activeLetter, handleJump, rangeChanged } = useAlphabetRail(
    { isGrouped, groups, flatItems },
    virtuosoRef
  );

  const overscan = { top: 600, bottom: 800 } as const;
  const stickyOffset = controlsH;

  // remount keys
  const dataSig = `${derived.filteredCount}|${ui.q}|${ui.sources.join(",")}|${ui.tags.join(",")}|${ui.showHidden}|${ui.installedOnly}`;
  const groupedKey = `grp:${dataSig}|${ui.sortKey}|${ui.sortDir}`;
  const flatKey = `flt:${dataSig}|${ui.sortKey}|${ui.sortDir}`;

  return (
    <Flex direction="column" h="100%" style={{ minHeight: 0 }}>
      <Box ref={controlsRef} p="md" style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--mantine-color-body)" }}>
        <ControlsHeader
          q={ui.q}
          setQ={ui.setQ}
          sources={ui.sources}
          setSources={ui.setSources}
          allSources={data.allSources}
          tags={ui.tags}
          setTags={ui.setTags}
          allTags={data.allTags}
          showHidden={ui.showHidden}
          setShowHidden={ui.setShowHidden}
          installedOnly={ui.installedOnly}
          setInstalledOnly={ui.setInstalledOnly}
          filteredCount={filteredCount}
          totalCount={totalCount}
        />
      </Box>

      <Box style={{ position: "sticky", top: stickyOffset, zIndex: 15 }}>
        <SortHeader
          headerRef={headerRef as unknown as (el: HTMLElement | null) => void}
          sortKey={ui.sortKey}
          sortDir={ui.sortDir}
          onToggleSort={ui.toggleSort}
        />
      </Box>

      <Box style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {isGrouped && groups ? (
          <GroupedVirtuoso
            ref={virtuosoRef}
            key={groupedKey}
            style={{ height: "100%" }}
            components={{ Scroller }}
            groupCounts={groups.map((g) => g.rows.length)}
            increaseViewportBy={overscan}
            rangeChanged={rangeChanged}
            groupContent={(index) => (
              <AlphabeticalSeparatorRow bucket={groups[index].title} top={(controlsH + headerH) || 0} />
            )}
            itemContent={(index) => {
              let i = index;
              for (const g of groups) {
                if (i < g.rows.length) {
                  const r = g.rows[i];
                  return (
                    <GameRow
                      id={r.id}
                      hidden={r.hidden}
                      installed={r.installed}
                      iconUrl={r.iconUrl}
                      title={r.title}
                      source={r.source}
                      tags={r.tags}
                      year={r.year}
                      url={r.url}
                      raw={r.raw}
                      sortingName={r.sortingName}
                    />
                  );
                }
                i -= g.rows.length;
              }
              return null;
            }}
          />
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            key={flatKey}
            style={{ height: "100%" }}
            components={{ Scroller }}
            data={derived.rowsSorted}
            increaseViewportBy={overscan}
            rangeChanged={rangeChanged}
            computeItemKey={(index, r) => r.id}
            itemContent={(index) => {
              const r = derived.rowsSorted[index];
              return (
                <GameRow
                  id={r.id}
                  hidden={r.hidden}
                  installed={r.installed}
                  iconUrl={r.iconUrl}
                  title={r.title}
                  source={r.source}
                  tags={r.tags}
                  year={r.year}
                  url={r.url}
                  raw={r.raw}
                  sortingName={r.sortingName}
                />
              );
            }}
          />
        )}

        {isGrouped && (
          <Box
            style={{
              display: "flex",
              alignItems: "stretch",
              pointerEvents: "none",
            }}
          >
            <Box style={{ pointerEvents: "auto", width: "100%" }}>
              <AlphabeticalRail active={activeLetter} onJump={handleJump} counts={counts} />
            </Box>
          </Box>
        )}
      </Box>
    </Flex>
  );
}
