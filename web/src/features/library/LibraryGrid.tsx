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

    // layout and virtualization
    const { cols, strideY, positions, containerHeight, viewportH } = useAbsoluteGridLayout(containerRef, {
        padding,
        cardWidth,
        cardHeight,
        gap,
        itemsLen: derived.itemsSorted.length,
    });

    // jump-to-scroll effect
    const { scrollItemIntoView } = useGridJumpToScroll({ containerRef, positions });

    // toggle handler with scroll effect
    const onToggleGridIndex = React.useCallback(
        (id: string, absoluteIndex: number) => {
            toggleOpen(id, () => requestAnimationFrame(() => scrollItemIntoView(absoluteIndex)));
        },
        [toggleOpen, scrollItemIntoView]
    );

    // virtual windowing
    const { visibleRange } = useVirtualWindow(containerRef, {
        overscan,
        padding,
        strideY,
        cols,
        itemsLen: derived.itemsSorted.length,
        containerHeight,
        viewportH,
    });

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

    // ensure scroll position is maintained on layout changes
    const openWidth = `calc(100vw - ${GRID.menuWidth}px - 12px - 15px)`;
    const openHeight = `calc(100vh - ${topOffset}px - ${GRID.iconSize}px - 12px)`;

    return (
        <Flex key={flatKey} direction="column" style={{ width: "100%", height: "100%" }}>
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
                style={{ position: "relative", width: "100%", flex: 1, height: "100%", overflow: "auto" }}
                aria-label="absolute-grid"
                role="list"
            >
                {/* Spacer to apply full non-virtualized grid height to the scroll area */}
                <Box aria-hidden style={{ width: "100%", height: containerHeight }} />

                {/* Visible window */}
                {derived.itemsSorted.slice(visibleRange.startIndex, visibleRange.endIndex).map((item: any, i: number) => {
                    const absoluteIndex = visibleRange.startIndex + i;
                    const { left, top } = positions[absoluteIndex] ?? { left: 0, top: 0 };
                    const isOpen = openIds.has(item.id);
                    const wasOpened = everOpenedIds.has(item.id);

                    return (
                        <Box
                            key={`${String(item.id)}|${installedUpdatedAt ?? ""}`}
                            role="listitem"
                            tabIndex={0}
                            style={{
                                position: "absolute",
                                left: (isOpen || wasOpened) ? 0 : left,
                                top: (isOpen || wasOpened) ? 0 : top,
                                width: (isOpen || wasOpened) ? openWidth : cardWidth,
                                height: (isOpen || wasOpened) ? openHeight : cardHeight,
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