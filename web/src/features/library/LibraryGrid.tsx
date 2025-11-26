import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { HeaderSort } from "./HeaderSort";
import { HeaderControls } from "./HeaderControls";
import { ExpandableItem } from "../../components/ExpandableItem";
import type { Item, LoadedData } from "./hooks/useLibraryData";
import { useLibraryState } from "./hooks/useLibraryState";
import { useAlphabetGroups } from "./hooks/useAlphabetGroups";
import { useAlphabetRail } from "./hooks/useAlphabetRail";
import { useCollapseOpenToggle } from "./hooks/useCollapseOpenToggle";
import { useRemountKeys } from "./hooks/useRemountKeys";
import { useAbsoluteGridLayout } from "./hooks/useAbsoluteGridLayout";
import { useGridJumpToScroll } from "./hooks/useGridJumpToScroll";
import { useVirtualWindow } from "./hooks/useVirtualWindow";
import { ViewMode } from "../../lib/types";
import { GRID, Z_INDEX } from "../../lib/constants";
import { AlphabeticalRail } from "../../components/AlphabeticalRail";

type Props = {
    data: LoadedData;
    onCountsChange?: (filtered: number, total: number) => void;
    view: ViewMode;
    setView: (view: ViewMode) => void;
    filteredCount: number;
    totalCount: number;
    installedUpdatedAt?: string;
};

function buildGridRows(
    items: any[],
    itemsLen: number,
    openIds: Set<string>,
    colsSafe: number
) {
    const rows: number[][] = [];
    const rowIsOpen: boolean[] = [];

    let currentRow: number[] = [];

    for (let i = 0; i < itemsLen; i++) {
        const item = items[i];
        if (!item) continue;
        const isOpen = openIds.has(item.id);

        if (isOpen) {
            // flush any partially filled row before inserting dedicated open row
            if (currentRow.length > 0) {
                rows.push(currentRow);
                rowIsOpen.push(false);
                currentRow = [];
            }
            // dedicated row for the open item
            rows.push([i]);
            rowIsOpen.push(true);
        } else {
            // normal grid placement
            currentRow.push(i);
            if (currentRow.length === colsSafe) {
                rows.push(currentRow);
                rowIsOpen.push(false);
                currentRow = [];
            }
        }
    }

    return { rowItems: rows, rowIsOpen };
}

function computeRowLayout(
    rowItems: number[][],
    rowIsOpen: boolean[],
    itemsLen: number,
    dynamicOpenHeight: number,
    baseClosedHeight: number,
) {
    const rowCount = rowItems.length;
    const rowTops = new Array<number>(rowCount);
    const rowHeights = new Array<number>(rowCount);
    const itemRowIndex = new Array<number>(itemsLen);
    const itemColIndex = new Array<number>(itemsLen);

    let y = GRID.padding;

    for (let r = 0; r < rowCount; r++) {
        rowTops[r] = y;
        const height = rowIsOpen[r] ? dynamicOpenHeight : baseClosedHeight;
        rowHeights[r] = height;

        const indices = rowItems[r];
        for (let c = 0; c < indices.length; c++) {
            const idx = indices[c];
            itemRowIndex[idx] = r;
            itemColIndex[idx] = c;
        }

        y += height + GRID.gap;
    }

    const containerHeight =
        rowCount === 0 ? GRID.padding * 2 + baseClosedHeight : y - GRID.gap + GRID.padding;
    return {
        rowTops,
        rowHeights,
        containerHeight,
        itemRowIndex,
        itemColIndex,
    };
}

function computeItemPositions(
    itemsLen: number,
    itemRowIndex: number[],
    itemColIndex: number[],
    rowTops: number[]
) {
    const out: { left: number; top: number }[] = new Array(itemsLen);
    const strideX = GRID.cardWidth + GRID.gap;

    for (let i = 0; i < itemsLen; i++) {
        const r = itemRowIndex[i];
        if (r == null) continue;

        const c = itemColIndex[i] ?? 0;
        out[i] = {
            left: GRID.padding + c * strideX,
            top: rowTops[r] ?? GRID.padding,
        };
    }

    return out;
}

/**
 * A grid layout for the library with absolute positioning and expandable items.
 * Handles dynamic row heights when items are expanded.
 * Uses virtual windowing for performance with large datasets.
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
    const { ui, derived } = useLibraryState(data);
    const { openIds, toggleOpen } = useCollapseOpenToggle();
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: headerRef, height: headerH } = useElementSize();

    // alphabet rail
    const { groups, isGrouped, flatItems } = useAlphabetGroups({
        sortKey: ui.sortKey,
        withBuckets: derived.withBuckets,
        itemsSorted: derived.itemsSorted,
    });

    // view mode
    const isListView = view === "list";

    // container ref
    const containerRef = useRef<HTMLDivElement | null>(null);

    // scroll-restore state for grid
    const preOpenScrollTopRef = useRef<number | null>(null);
    const openItemIdRef = useRef<string | null>(null);
    const userScrolledWhileOpenRef = useRef(false);
    const programmaticScrollRef = useRef(false);

    // pending scroll index after open
    const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(
        null
    );

    // counts effect like LibraryList
    useEffect(() => {
        onCountsChange?.(derived.filteredCount, derived.totalCount);
    }, [derived.filteredCount, derived.totalCount, onCountsChange]);

    const itemsLen = derived.itemsSorted.length;

    // basic grid sizing (columns + viewportH)
    const { cols, viewportH } = useAbsoluteGridLayout(containerRef, itemsLen);

    // ensure at least 1 column
    const colsSafe = isListView ? 1 : Math.max(1, cols || 1);


    // top offset like LibraryList (controls + header)
    const topOffset = controlsH + headerH;

    // track window inner height to match the CSS calc(100vh - topOffset - ...)
    const [windowInnerH, setWindowInnerH] = useState<number>(
        typeof window !== "undefined" ? window.innerHeight : 0
    );

    useLayoutEffect(() => {
        if (typeof window === "undefined") return;
        const onResize = () => {
            setWindowInnerH(window.innerHeight);
        };
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // CSS open dimensions for the actual card content
    const openWidth = `calc(100vw - ${GRID.menuWidth}px - 15px)`;
    const openHeight = `calc(100vh - ${topOffset}px - ${GRID.iconSize}px - 12px)`;

    // numeric open height used for layout math (matches the CSS calc)
    const dynamicOpenHeight = useMemo(() => {
        if (windowInnerH <= 0) return GRID.cardHeight;
        const h = windowInnerH - topOffset - GRID.iconSize - 12;
        return Math.max(GRID.cardHeight, h);
    }, [windowInnerH, topOffset]);

    const baseClosedHeight = isListView ? GRID.rowHeight : GRID.cardHeight;

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

    // reset scroll on remount
    useEffect(() => {
        const el = containerRef.current;
        if (el) el.scrollTop = 0;
    }, [flatKey]);

    // track user scrolls while an item is open
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onScroll = () => {
            if (programmaticScrollRef.current) return;
            if (openItemIdRef.current) {
                userScrolledWhileOpenRef.current = true;
            }
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    // build rows with open items taking full rows
    const { rowItems, rowIsOpen } = useMemo(
        () =>
            buildGridRows(derived.itemsSorted, itemsLen, openIds, colsSafe),
        [derived.itemsSorted, itemsLen, openIds, colsSafe]
    );

    // per-row item index ranges for virtual window mapping
    const rowFirstItemIndexPerRow = useMemo(
        () => rowItems.map((row) => (row.length ? row[0] : 0)),
        [rowItems]
    );

    // exclusive end indexs per row
    const rowLastItemIndexExclusivePerRow = useMemo(
        () => rowItems.map((row) => (row.length ? row[row.length - 1] + 1 : 0)),
        [rowItems]
    );

    // compute row layout including open rows
    const {
        rowTops,
        rowHeights,
        containerHeight,
        itemRowIndex,
        itemColIndex,
    } = useMemo(
        () =>
            computeRowLayout(
                rowItems,
                rowIsOpen,
                itemsLen,
                dynamicOpenHeight,
                baseClosedHeight
            ),
        [
            rowItems,
            rowIsOpen,
            itemsLen,
            dynamicOpenHeight,
            baseClosedHeight,
        ]
    );

    // compute item positions based on row layout
    const positions = useMemo(
        () =>
            computeItemPositions(
                itemsLen,
                itemRowIndex,
                itemColIndex,
                rowTops
            ),
        [itemsLen, itemRowIndex, itemColIndex, rowTops]
    );

    // jump-to-scroll effect uses the *current* positions
    const { scrollItemIntoView } = useGridJumpToScroll({
        containerRef,
        positions,
    });

    // virtual windowing with variable-height rows
    const { visibleRange } = useVirtualWindow(containerRef, {
        rows: rowTops.length,
        cols: colsSafe,
        itemsLen,
        rowTops,
        rowHeights,
        containerHeight,
        viewportH,
        rowFirstItemIndexPerRow,
        rowLastItemIndexExclusivePerRow,
    });

    const { counts: railCounts, activeLetter, handleJump } = useAlphabetRail({
        isGrouped,
        groups,
        flatItems,
        scrollItemIntoView,
        visibleStartIndex: visibleRange.startIndex,
        totalItems: itemsLen,
    });

    // only show rail when sorting by title & we actually have data
    const showRail = ui.sortKey === "title" && derived.filteredCount > 0;

    // toggle handler: remember scrollTop on open, restore on close if user didn't scroll
    const onToggleGridIndex = useCallback(
        (id: string, absoluteIndex: number) => {
            const willOpen = !openIds.has(id);
            const el = containerRef.current;

            if (willOpen) {
                preOpenScrollTopRef.current = el ? el.scrollTop : null;
                openItemIdRef.current = id;
                userScrolledWhileOpenRef.current = false;

                toggleOpen(id);
                setPendingScrollIndex(absoluteIndex);
            } else {
                const shouldRestore =
                    openItemIdRef.current === id &&
                    !userScrolledWhileOpenRef.current &&
                    preOpenScrollTopRef.current != null &&
                    el;

                toggleOpen(id);

                if (shouldRestore && el) {
                    programmaticScrollRef.current = true;
                    el.scrollTo({
                        top: preOpenScrollTopRef.current!,
                        behavior: "auto",
                    });
                    requestAnimationFrame(() => {
                        programmaticScrollRef.current = false;
                    });
                }

                openItemIdRef.current = null;
                preOpenScrollTopRef.current = null;
                userScrolledWhileOpenRef.current = false;
            }
        },
        [openIds, toggleOpen]
    );

    // effect to perform scroll after layout has updated for the opened item
    useEffect(() => {
        if (pendingScrollIndex == null) return;

        const idx = pendingScrollIndex;

        // if index is out of range or item is no longer open, abort
        const item = derived.itemsSorted[idx];
        if (!item || !openIds.has(item.id)) {
            setPendingScrollIndex(null);
            return;
        }

        // using the OPEN layout, so we scroll to the new row
        programmaticScrollRef.current = true;
        scrollItemIntoView(idx);
        requestAnimationFrame(() => {
            programmaticScrollRef.current = false;
        });

        setPendingScrollIndex(null);
    }, [pendingScrollIndex, derived.itemsSorted, openIds, scrollItemIntoView]);

    return (
        <Flex direction="column" style={{ width: "100%", height: "100%" }}>
            <HeaderControls
                controlsRef={
                    controlsRef as unknown as (el: HTMLElement | null) => void
                }
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
                headerRef={
                    headerRef as unknown as (el: HTMLElement | null) => void
                }
                sortKey={ui.sortKey}
                sortDir={ui.sortDir}
                onToggleSort={ui.toggleSort}
                gridColumns={GRID.colsList}
            />

            <Box
                ref={containerRef}
                style={{ flex: 1, position: "relative", width: "100%", height: "100%", overflow: "auto" }}
                aria-label="absolute-grid"
                role="list"
            >
                {/* Spacer to apply full non-virtualized grid height to the scroll area */}
                <Box aria-hidden style={{ width: "100%", height: containerHeight }} />

                {/* Visible window */}
                {derived.itemsSorted
                    .slice(visibleRange.startIndex, visibleRange.endIndex)
                    .map((item: Item, i: number) => {
                        const absoluteIndex = visibleRange.startIndex + i;
                        const pos = positions[absoluteIndex] ?? {
                            left: GRID.padding,
                            top: GRID.padding,
                        };

                        // Open item OR list rows should occupy full width from the left edge
                        const isOpen = openIds.has(item.id);
                        let { left, top } = pos;
                        if (isOpen || isListView) left = 0;

                        return (
                            <Box
                                key={`${String(item.id)}|${installedUpdatedAt ?? ""}`}
                                role="listitem"
                                tabIndex={0}
                                style={{
                                    position: "absolute",
                                    boxSizing: "border-box",
                                    display: "flex",
                                    flexDirection: "column",
                                    overflow: "hidden",
                                    left,
                                    top,
                                    width: isOpen
                                        ? openWidth
                                        : isListView
                                            ? "100%"
                                            : GRID.cardWidth,
                                    height: isOpen
                                        ? openHeight
                                        : isListView
                                            ? GRID.rowHeight
                                            : GRID.cardHeight,
                                    zIndex: isOpen ? Z_INDEX.aboveBase : Z_INDEX.base,
                                    backgroundColor: "var(--mantine-color-default-background)",
                                }}
                            >
                                <ExpandableItem
                                    item={item}
                                    isOpen={isOpen}
                                    topOffset={topOffset}
                                    openWidth={openWidth}
                                    openHeight={openHeight}
                                    view={view}
                                    onToggle={() =>
                                        onToggleGridIndex(item.id, absoluteIndex)
                                    }
                                />
                            </Box>
                        );
                    })}
            </Box>

            <Box style={{ display: "flex", alignItems: "stretch", pointerEvents: "none" }}>
                <Box style={{ pointerEvents: "auto", width: "100%" }}>
                    <AlphabeticalRail active={activeLetter} onJump={handleJump} counts={railCounts} />
                </Box>
            </Box>
        </Flex>
    );
}
