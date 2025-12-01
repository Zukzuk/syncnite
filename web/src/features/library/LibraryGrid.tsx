import React, { useEffect, useRef } from "react";
import { Box, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { HeaderSort } from "./components/HeaderSort";
import { HeaderControls } from "./components/HeaderControls";
import { ExpandableItem } from "./components/ExpandableItem";
import { AlphabeticalRail } from "./components/AlphabeticalRail";
import { useLibraryState } from "./hooks/useLibraryState";
import { useGrid } from "./hooks/useGrid";
import { GRID, MAX_ASSOCIATED, Z_INDEX } from "../../lib/constants";
import { GameItem, LoadedData, ViewMode } from "../../types/types";

type Props = {
    libraryData: LoadedData;
    view: ViewMode;
    installedUpdatedAt?: string;
    setView: (view: ViewMode) => void;
};

function intersects(
    a: string[] | null | undefined,
    b: string[] | null | undefined
): boolean {
    if (!a?.length || !b?.length) return false;
    const set = new Set(a);
    return b.some((v) => set.has(v));
}

function getRelatedBySeries(item: GameItem, all: GameItem[]): GameItem[] {
    if (!item.series || item.series.length === 0) return [];
    return all
        .filter(
            (other) =>
                // other.id !== item.id &&
                !!other.coverUrl &&
                intersects(other.series, item.series)
        )
        .slice(0, MAX_ASSOCIATED);
}

function getRelatedByTags(item: GameItem, all: GameItem[]): GameItem[] {
    if (!item.tags || item.tags.length === 0) return [];
    return all
        .filter(
            (other) =>
                other.id !== item.id &&
                !!other.coverUrl &&
                intersects(other.tags, item.tags)
        )
        .slice(0, MAX_ASSOCIATED);
}

function getRelatedByYear(item: GameItem, all: GameItem[]): GameItem[] {
    if (!item.year) return [];
    return all
        .filter(
            (other) =>
                other.id !== item.id &&
                !!other.coverUrl &&
                other.year === item.year
        )
        .slice(0, MAX_ASSOCIATED);
}

/**
 * Absolute-positioned library grid with expandable items, virtual scrolling
 * and alphabetical rail navigation.
 */
export default function LibraryGrid({
    libraryData,
    installedUpdatedAt,
    view,
    setView,
}: Props): JSX.Element {
    const { ui, derived } = useLibraryState({ items: libraryData.items });
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: headerRef, height: headerH } = useElementSize();
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Data signature for resetting
    const { filteredCount, totalCount, itemsSorted } = derived;
    const { q, sources, tags, series, showHidden, installedOnly, sortKey, sortDir, onToggleSort } = ui;
    const dataSig = `${derived.filteredCount}|${q}|${sources.join(",")}|${tags.join(",")}|${series.join(",")}|${showHidden}|${installedOnly}`;
    const groupedKey = `grp:${dataSig}|${sortKey}|${sortDir}`;
    const flatKey = `flt:${dataSig}|${sortKey}|${sortDir}`;
    const isListView = view === "list";

    // Reset scroll position when dataset semantics change
    useEffect(() => {
        const el = containerRef.current;
        if (el) el.scrollTop = 0;
    }, [flatKey]);

    // Use grid hook for layout and positioning
    const {
        containerHeight,
        positions,
        visibleRange,
        railCounts,
        activeLetter,
        openWidth,
        openHeight,
        topOffset,
        openIds,
        hasOpenItemInView,
        onScrollJump,
        onToggleItem,
        onAssociatedClick,
    } = useGrid({
        containerRef,
        isListView,
        controlsH,
        headerH,
        ui,
        derived,
    });

    // Render visible items only
    const renderVisibleItems = () => {
        return derived.itemsSorted
            .slice(visibleRange.startIndex, visibleRange.endIndex)
            .map((item: GameItem, i: number) => {
                const absoluteIndex = visibleRange.startIndex + i;
                const pos = positions[absoluteIndex] ?? {
                    left: GRID.gap,
                    top: GRID.gap,
                };
                const isOpen = openIds.has(item.id);

                const relatedBySeries = isOpen
                    ? getRelatedBySeries(item, derived.itemsSorted)
                    : undefined;
                const relatedByTags = isOpen
                    ? getRelatedByTags(item, derived.itemsSorted)
                    : undefined;
                const relatedByYear = isOpen
                    ? getRelatedByYear(item, derived.itemsSorted)
                    : undefined;

                return (
                    <Box
                        key={`${String(item.id)}|${installedUpdatedAt ?? ""}`}
                        aria-label="library-item-container"
                        role="library-item-container"
                        tabIndex={0}
                        style={{
                            display: "flex",
                            position: "absolute",
                            boxSizing: "border-box",
                            flexDirection: "column",
                            overflow: "hidden",
                            backgroundColor:
                                "var(--mantine-color-default-background)",
                            left: isOpen || isListView ? 0 : pos.left,
                            top: pos.top,
                            width: isOpen || isListView ? openWidth : GRID.cardWidth,
                            height: isOpen
                                ? openHeight
                                : isListView
                                    ? GRID.rowHeight
                                    : GRID.cardHeight,
                            zIndex: isOpen ? Z_INDEX.aboveBase : Z_INDEX.base,
                        }}
                    >
                        <ExpandableItem
                            aria-label="expandable-item"
                            item={item}
                            isOpen={isOpen}
                            topOffset={topOffset}
                            openHeight={openHeight}
                            isListView={isListView}
                            onToggleItem={() =>
                                onToggleItem(item.id, absoluteIndex)
                            }
                            onAssociatedClick={(targetId) =>
                                onAssociatedClick(item.id, targetId)
                            }
                            relatedBySeries={relatedBySeries}
                            relatedByTags={relatedByTags}
                            relatedByYear={relatedByYear}
                        />
                    </Box>
                );
            });
    };

    return (
        <Flex direction="column" style={{ width: "100%", height: "100%" }}>
            <HeaderControls
                controlsRef={
                    controlsRef as unknown as (el: HTMLElement | null) => void
                }
                aria-label="header-controls"
                allSources={libraryData.allSources}
                allTags={libraryData.allTags}
                allSeries={libraryData.allSeries}
                view={view}
                setView={setView}
                filteredCount={filteredCount}
                totalCount={totalCount}
                {...ui}
            />

            <HeaderSort
                headerRef={
                    headerRef as unknown as (el: HTMLElement | null) => void
                }
                aria-label="header-sort"
                sortKey={sortKey}
                sortDir={sortDir}
                isListView={isListView}
                hasOpenItemInView={hasOpenItemInView}
                onToggleSort={onToggleSort}
            />

            <Box
                ref={containerRef}
                aria-label="absolute-grid"
                role="library"
                style={{
                    flex: 1,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    overflowX: "hidden",
                }}
            >
                <Box
                    aria-hidden
                    role="grid-height-spacer"
                    style={{ width: "100%", height: containerHeight }}
                />

                {itemsSorted && renderVisibleItems()}
            </Box>

            {sortKey === "title" && (
                <AlphabeticalRail
                    activeLetter={activeLetter}
                    onScrollJump={onScrollJump}
                    railCounts={railCounts}
                />
            )}
        </Flex>
    );
}
