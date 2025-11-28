import React, { useEffect, useRef } from "react";
import { Box, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { HeaderSort } from "./components/HeaderSort";
import { HeaderControls } from "./components/HeaderControls";
import { ExpandableItem } from "./components/ExpandableItem";
import { AlphabeticalRail } from "./components/AlphabeticalRail";
import { useAbsoluteGridLayout } from "./hooks/useAbsoluteGridLayout";
import { useAbsoluteGridModel } from "./hooks/useAbsoluteGridModel";
import { useAlphabetGroups } from "./hooks/useAlphabetGroups";
import { useCollapseToggle } from "./hooks/useCollapseToggle";
import { useLibraryState } from "./hooks/useLibraryState";
import { useRemountKeys } from "./hooks/useRemountKeys";
import { useOpenCardDimensions } from "./hooks/useOpenCardDimensions";
import { useOpenItemScrollRestore } from "./hooks/useOpenItemScrollRestore";
import { GRID, Z_INDEX } from "../../lib/constants";
import { GameItem, LoadedData, ViewMode } from "../../types/types";

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
 * Absolute-positioned library grid with expandable items, virtual scrolling
 * and alphabetical rail navigation.
 */
export default function LibraryGrid({ data, onCountsChange, view, setView, filteredCount, totalCount, installedUpdatedAt }: Props): JSX.Element {
    const { ui, derived } = useLibraryState({ items: data.items });
    const { openIds, toggleOpen } = useCollapseToggle();
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: headerRef, height: headerH } = useElementSize();

    // Alphabet groups for rail
    const { alphabeticalGroups, isGrouped, flatItems } = useAlphabetGroups({
        sortKey: ui.sortKey,
        itemsGroupedByLetter: derived.itemsGroupedByLetter,
        itemsSorted: derived.itemsSorted,
    });

    // Scroll container
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Notify parent about counts (stay compatible with existing props)
    useEffect(() => {
        onCountsChange?.(derived.filteredCount, derived.totalCount);
    }, [derived.filteredCount, derived.totalCount, onCountsChange]);

    // Total items length
    const itemsLen = derived.itemsSorted.length;

    // Base grid sizing (cols + viewport height)
    const { cols, viewportH } = useAbsoluteGridLayout({ containerRef, itemsLen });
    const colsSafe = view === "list" ? 1 : Math.max(1, cols || 1);

    // Combined sticky header/controls offset
    const topOffset = controlsH + headerH;

    // Open card CSS + numeric height
    const { openWidth, openHeight, dynamicOpenHeight } = useOpenCardDimensions({
        topOffset,
    });

    // Base closed item height
    const baseClosedHeight = view === "list" ? GRID.rowHeight : GRID.cardHeight;

    // Keys to reset scroll on major filter/sort changes
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

    // Reset scroll position when dataset semantics change
    useEffect(() => {
        const el = containerRef.current;
        if (el) el.scrollTop = 0;
    }, [flatKey]);

    // Central grid model: rows, positions, virtual window, rail
    const {
        containerHeight,
        positions,
        visibleRange,
        scrollItemIntoView,
        railCounts,
        activeLetter,
        handleJump,
    } = useAbsoluteGridModel({
        itemsSorted: derived.itemsSorted,
        openIds,
        colsSafe,
        dynamicOpenHeight,
        baseClosedHeight,
        containerRef,
        viewportH,
        isGrouped,
        alphabeticalGroups,
        flatItems,
        view,
    });

    // Open/close behavior with scroll restore
    const { onToggleItem } = useOpenItemScrollRestore({
        containerRef,
        openIds,
        items: derived.itemsSorted as GameItem[],
        scrollItemIntoView,
        toggleOpen: (id: string) => toggleOpen(id),
    });

    // Render visible items only
    const renderVisibleItems = () => {
        return derived.itemsSorted
            .slice(visibleRange.startIndex, visibleRange.endIndex)
            .map((item: GameItem, i: number) => {
                const absoluteIndex = visibleRange.startIndex + i;
                const pos = positions[absoluteIndex] ?? { left: GRID.padding, top: GRID.padding };
                const isOpen = openIds.has(item.id);

                // Adjust top to account for dynamic open heights above
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
                            backgroundColor: "var(--mantine-color-default-background)",
                            left: (isOpen || view === "list") ? 0 : pos.left,
                            top: pos.top,
                            width: (isOpen) ? openWidth : (view === "list") ? openWidth : GRID.cardWidth,
                            height: (isOpen) ? openHeight : (view === "list") ? GRID.rowHeight : GRID.cardHeight,
                            zIndex: (isOpen) ? Z_INDEX.aboveBase : Z_INDEX.base,
                        }}
                    >
                        <ExpandableItem
                            aria-label="library-item"
                            item={item}
                            isOpen={isOpen}
                            topOffset={topOffset}
                            openWidth={openWidth}
                            openHeight={openHeight}
                            view={view}
                            onToggle={() => onToggleItem(item.id, absoluteIndex)}
                        />
                    </Box>
                );
            })
    }

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
                style={{ flex: 1, position: "relative", width: "100%", height: "100%", overflow: "auto" }}
                aria-label="absolute-grid"
                role="library"
            >
                {/* Spacer to give scroll area full height */}
                <Box aria-hidden role="grid-height-spacer" style={{ width: "100%", height: containerHeight }} />

                {/* Visible window only */}
                {derived.itemsSorted ? renderVisibleItems() : null}
            </Box>

            <AlphabeticalRail activeLetter={activeLetter} handleJump={handleJump} railCounts={railCounts} />
        </Flex>
    );
}
