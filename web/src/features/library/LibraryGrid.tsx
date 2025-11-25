import React, { useCallback, useLayoutEffect, useRef } from "react";
import { Box, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { HeaderSort } from "./HeaderSort";
import { HeaderControls } from "./HeaderControls";
import { ExpandableItemWrapper } from "../../components/ExpandableItem";
import { useLibraryState } from "./hooks/useLibraryState";
import type { LoadedData } from "./hooks/useLibrary";
import { useCollapseOpenToggle } from "./hooks/useCollapseOpenToggle";
import { useRemountKeys } from "./hooks/useRemountKeys";
import { useAbsoluteGridLayout } from "./hooks/useAbsoluteGridLayout";
import { useVirtualWindow } from "./hooks/useVirtualWindow";
import { ViewMode } from "../../lib/types";
import { GRID } from "../../lib/constants";
import { useGridJumpToScroll } from "./hooks/useGridJumpToScroll";

type Props = {
    data: LoadedData;
    onCountsChange?: (filtered: number, total: number) => void;
    view: ViewMode;
    setView: (view: ViewMode) => void;
    filteredCount: number;
    totalCount: number;
    installedUpdatedAt?: string;
};

/** 
 * AbsoluteGrid component for displaying library items in a virtualized grid layout.
 * Props:
 * - data: Loaded library data including items and metadata.
 * - onCountsChange: Optional callback for when filtered/total counts change.
 * - view: Current view mode.
 */
export default function AbsoluteGrid({
    data,
    onCountsChange,
    view,
    setView,
    filteredCount,
    totalCount,
    installedUpdatedAt,
}: Props) {
    const overscan = { top: 600, bottom: 800 } as const;
    const cardWidth = 160;
    const cardHeight = 300;
    const gap = 4;
    const padding = 2;
    const { ui, derived } = useLibraryState(data);
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: headerRef, height: headerH } = useElementSize();
    const { openIds, everOpenedIds, toggleOpen } = useCollapseOpenToggle();

    const containerRef = useRef<HTMLDivElement | null>(null);

    // counts effect like LibraryList
    React.useEffect(() => {
        onCountsChange?.(derived.filteredCount, derived.totalCount);
    }, [derived.filteredCount, derived.totalCount, onCountsChange]);

    // layout (base grid)
    const { cols, rows, viewportH } = useAbsoluteGridLayout(containerRef, {
        padding,
        cardWidth,
        cardHeight,
        gap,
        itemsLen: derived.itemsSorted.length,
    });

    const itemsLen = derived.itemsSorted.length;

    // top offset like LibraryList (controls + header)
    const topOffset = controlsH + headerH;

    // remount on filter/sort change like LibraryList
    const { flatKey } = useRemountKeys({
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

    // expanded dimensions in grid mode (CSS values for the actual card)
    const openWidth = `calc(100vw - ${GRID.menuWidth}px - 12px - 15px)`;
    const openHeight = `calc(100vh - ${topOffset}px - ${GRID.iconSize}px - 12px)`;

    // numeric approximation for open height for layout math
    const numericOpenHeight = React.useMemo(() => {
        if (viewportH <= 0) return cardHeight;
        const approx = viewportH - GRID.iconSize - 12; // match openHeight minus icon/padding
        return Math.max(cardHeight, approx);
    }, [viewportH, cardHeight]);

    // extra height per row if that row contains any open item
    const rowExtra = React.useMemo(() => {
        if (!rows || openIds.size === 0) {
            return new Array(Math.max(0, rows)).fill(0);
        }

        const extras = new Array(rows).fill(0);
        const extraPerRow = Math.max(0, numericOpenHeight - cardHeight);
        if (extraPerRow <= 0) return extras;

        const colsSafe = Math.max(1, cols);

        for (let idx = 0; idx < itemsLen; idx++) {
            const item = derived.itemsSorted[idx];
            if (!item) continue;
            if (openIds.has(item.id)) {
                const row = Math.floor(idx / colsSafe);
                if (row >= 0 && row < rows) {
                    extras[row] = extraPerRow;
                }
            }
        }

        return extras;
    }, [rows, cols, openIds, numericOpenHeight, cardHeight, itemsLen, derived.itemsSorted]);

    // compute rowTops, rowHeights and containerHeight from rowExtra
    const { rowTops, rowHeights, containerHeight } = React.useMemo(() => {
        if (!rows) {
            return {
                rowTops: [] as number[],
                rowHeights: [] as number[],
                containerHeight: padding * 2 + cardHeight,
            };
        }

        const tops = new Array<number>(rows);
        const heights = new Array<number>(rows);

        let y = padding;
        for (let r = 0; r < rows; r++) {
            tops[r] = y;
            const h = cardHeight + (rowExtra[r] || 0);
            heights[r] = h;
            y += h + gap;
        }

        const height =
            rows === 0
                ? padding * 2 + cardHeight
                : tops[rows - 1] + heights[rows - 1] + padding;

        return { rowTops: tops, rowHeights: heights, containerHeight: height };
    }, [rows, rowExtra, padding, cardHeight, gap]);

    // recompute absolute positions from rowTops to reflect expanded rows
    const positions = React.useMemo(() => {
        const out: { left: number; top: number }[] = new Array(itemsLen);
        const strideX = cardWidth + gap;
        const colsSafe = Math.max(1, cols);

        for (let i = 0; i < itemsLen; i++) {
            const col = i % colsSafe;
            const row = Math.floor(i / colsSafe);
            out[i] = {
                left: padding + col * strideX,
                top: rowTops[row] ?? padding,
            };
        }

        return out;
    }, [itemsLen, cols, padding, cardWidth, gap, rowTops]);

    // jump-to-scroll effect uses the *current* positions
    const { scrollItemIntoView } = useGridJumpToScroll({ containerRef, positions });

    // toggle handler with scroll effect
    const onToggleGridIndex = React.useCallback(
        (id: string, absoluteIndex: number) => {
            toggleOpen(id, () =>
                requestAnimationFrame(() => scrollItemIntoView(absoluteIndex))
            );
        },
        [toggleOpen, scrollItemIntoView]
    );

    // virtual windowing with variable-height rows
    const { visibleRange } = useVirtualWindow(containerRef, {
        overscan,
        rows,
        cols,
        itemsLen,
        rowTops,
        rowHeights,
        containerHeight,
        viewportH,
    });

    // reset scroll when filter/sort changes
    React.useEffect(() => {
        const el = containerRef.current;
        if (el) {
            el.scrollTop = 0;
        }
    }, [flatKey]);

    return (
        <Flex direction="column" style={{ width: "100%", height: "100%" }}>
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

            <Box
                ref={containerRef}
                style={{
                    position: "relative",
                    width: "100%",
                    flex: 1,
                    height: "100%",
                    overflow: "auto",
                }}
                aria-label="absolute-grid"
                role="list"
            >
                {/* Spacer to apply full non-virtualized grid height to the scroll area */}
                <Box aria-hidden style={{ width: "100%", height: containerHeight }} />

                {/* Visible window */}
                {derived.itemsSorted
                    .slice(visibleRange.startIndex, visibleRange.endIndex)
                    .map((item: any, i: number) => {
                        const absoluteIndex = visibleRange.startIndex + i;
                        const pos = positions[absoluteIndex] ?? { left: padding, top: padding };
                        let { left, top } = pos;

                        const isOpen = openIds.has(item.id);
                        const wasOpened = everOpenedIds.has(item.id);

                        // when open, item should occupy the whole row from left padding
                        if (isOpen) {
                            left = padding;
                        }

                        return (
                            <Box
                                key={`${String(item.id)}|${installedUpdatedAt ?? ""}`}
                                role="listitem"
                                tabIndex={0}
                                style={{
                                    position: "absolute",
                                    left,
                                    top,
                                    width: isOpen ? openWidth : cardWidth,
                                    height: isOpen ? openHeight : cardHeight,
                                    boxSizing: "border-box",
                                    display: "flex",
                                    flexDirection: "column",
                                    overflow: "hidden",
                                    zIndex: isOpen ? 2 : 1,
                                    backgroundColor: "var(--mantine-color-default-background)",
                                }}
                            >
                                <ExpandableItemWrapper
                                    item={item}
                                    collapseOpen={isOpen}
                                    everOpened={wasOpened}
                                    topOffset={topOffset}
                                    openWidth={openWidth}
                                    openHeight={openHeight}
                                    layout="grid"
                                    onToggle={() => onToggleGridIndex(item.id, absoluteIndex)}
                                />
                            </Box>
                        );
                    })}
            </Box>
        </Flex>
    );
}
