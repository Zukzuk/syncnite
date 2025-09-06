import React from "react";
import { Box, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import type { Loaded } from "../../lib/data";
import { Controls } from "../header/Controls";
import { useLibraryState } from "../hooks/useLibraryState";
import { GameRow } from "./GameRow";
import { AlphaSeparatorRow } from "./AlphaSeparatorRow";
import { VirtuosoHeader } from "./VirtuosoHeader";
import { Virtuoso, GroupedVirtuoso } from "react-virtuoso";

export function LibraryView({
  data,
  onCountsChange,
}: {
  data: Loaded;
  onCountsChange?: (filtered: number, total: number) => void;
}) {
  const { ui, derived } = useLibraryState(data);
  const { ref: controlsRef, height: controlsH } = useElementSize();
  const { ref: headerRef, height: headerH } = useElementSize();

  React.useEffect(() => {
    onCountsChange?.(derived.filteredCount, derived.totalCount);
  }, [derived.filteredCount, derived.totalCount, onCountsChange]);

  const groups = React.useMemo(() => {
    if (ui.sortKey !== "title") return null;
    const out: Array<{ title: string; rows: typeof derived.rowsSorted }> = [];
    let current: { title: string; rows: typeof derived.rowsSorted } | null = null;
    for (const { row, bucket } of derived.withBuckets) {
      if (!current || current.title !== bucket) {
        current = { title: bucket, rows: [] };
        out.push(current);
      }
      current.rows.push(row);
    }
    return out;
  }, [ui.sortKey, derived.withBuckets, derived.rowsSorted]);

  const overscan = { top: 600, bottom: 800 } as const;
  const stickyOffset = controlsH;

  // Build a small signature that changes whenever the visible dataset semantics change
  const dataSig = `${derived.filteredCount}|${ui.q}|${ui.source ?? ""}|${ui.tag ?? ""}|${ui.showHidden}|${ui.installedOnly}`;

  // Force remount on mode switch (grouped vs flat) and dataset changes
  const groupedKey = `grp:${dataSig}|${ui.sortKey}|${ui.sortDir}`;
  const flatKey = `flt:${dataSig}|${ui.sortKey}|${ui.sortDir}`;

  return (
    <Flex direction="column" h="100%" style={{ minHeight: 0 }}>
      <Box
        ref={controlsRef}
        p="md"
        style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--mantine-color-body)" }}
      >
        <Controls
          q={ui.q} setQ={ui.setQ}
          source={ui.source} setSource={ui.setSource} sources={data.allSources}
          tag={ui.tag} setTag={ui.setTag} tags={data.allTags}
          showHidden={ui.showHidden} setShowHidden={ui.setShowHidden}
          installedOnly={ui.installedOnly} setInstalledOnly={ui.setInstalledOnly}
        />
      </Box>

      <div style={{ position: "sticky", top: stickyOffset, zIndex: 15 }}>
        <VirtuosoHeader
          headerRef={headerRef as unknown as (el: HTMLElement | null) => void}
          sortKey={ui.sortKey}
          sortDir={ui.sortDir}
          onToggleSort={ui.toggleSort}
        />
      </div>

      <Box style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {ui.sortKey === "title" && groups ? (
          <GroupedVirtuoso
            key={groupedKey}                   // ← force remount when needed
            style={{ height: "100%" }}
            groupCounts={groups.map((g) => g.rows.length)}
            increaseViewportBy={overscan}
            groupContent={(index) => (
              <AlphaSeparatorRow
                bucket={groups[index].title}
                top={(controlsH + headerH) || 0}
              />
            )}
            itemContent={(index) => {
              // flatten across groups
              let i = index;
              for (const g of groups) {
                if (i < g.rows.length) {
                  const r = g.rows[i];
                  return (
                    <GameRow
                      id={r.id}
                      hidden={r.hidden}
                      showHidden={ui.showHidden}
                      installed={r.installed}
                      iconUrl={r.iconUrl}
                      title={r.title}
                      source={r.source}
                      tags={r.tags}
                      year={r.year}
                      url={r.url}
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
            key={flatKey}                      // ← force remount when needed
            style={{ height: "100%" }}
            data={derived.rowsSorted}
            increaseViewportBy={overscan}
            computeItemKey={(index, r) => r.id}
            itemContent={(index /*, _item */) => {
              const r = derived.rowsSorted[index];
              return (
                <GameRow
                  id={r.id}
                  hidden={r.hidden}
                  showHidden={ui.showHidden}
                  installed={r.installed}
                  iconUrl={r.iconUrl}
                  title={r.title}
                  source={r.source}
                  tags={r.tags}
                  year={r.year}
                  url={r.url}
                />
              );
            }}
          />
        )}
      </Box>
    </Flex>
  );
}