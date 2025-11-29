import React, { useEffect, useRef } from "react";
import { Box, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { HeaderSort } from "./components/HeaderSort";
import { HeaderControls } from "./components/HeaderControls";
import { ExpandableItem } from "./components/ExpandableItem";
import { AlphabeticalRail } from "./components/AlphabeticalRail";
import { useLibraryState } from "./hooks/useLibraryState";
import { useGrid } from "./hooks/useGrid";
import { GRID, Z_INDEX } from "../../lib/constants";
import { GameItem, LoadedData, ViewMode } from "../../types/types";

type Props = {
    libraryData: LoadedData;
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
export default function LibraryGrid({ libraryData, onCountsChange, view, setView, filteredCount, totalCount, installedUpdatedAt }: Props): JSX.Element {
    const { ui, derived } = useLibraryState({ items: libraryData.items });
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: headerRef, height: headerH } = useElementSize();
    const containerRef = useRef<HTMLDivElement | null>(null);
    
    // Data signature for resetting
    const dataSig = `${derived.filteredCount}|${ui.q}|${ui.sources.join(",")}|${ui.tags.join(",")}|${ui.series.join(",")}|${ui.showHidden}|${ui.installedOnly}`;
    const groupedKey = `grp:${dataSig}|${ui.sortKey}|${ui.sortDir}`;
    const flatKey = `flt:${dataSig}|${ui.sortKey}|${ui.sortDir}`;

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
        onScrollJump,
        onToggleItem,
    } = useGrid({
        containerRef,
        view,
        controlsH,
        headerH,
        ui, 
        derived,
    });

    // Reset scroll position when dataset semantics change
    useEffect(() => {
        const el = containerRef.current;
        if (el) el.scrollTop = 0;
    }, [flatKey]);

    // Notify parent about counts 
    useEffect(() => {
        onCountsChange?.(derived.filteredCount, derived.totalCount);
    }, [derived.filteredCount, derived.totalCount, onCountsChange]);

    // Render visible items only
    const renderVisibleItems = () => {
        return derived.itemsSorted
            .slice(visibleRange.startIndex, visibleRange.endIndex)
            .map((item: GameItem, i: number) => {
                const absoluteIndex = visibleRange.startIndex + i;
                const pos = positions[absoluteIndex] ?? { left: GRID.gap, top: GRID.gap };
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
                allSources={libraryData.allSources}
                allTags={libraryData.allTags}
                allSeries={libraryData.allSeries}
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

            <AlphabeticalRail activeLetter={activeLetter} onScrollJump={onScrollJump} railCounts={railCounts} />
        </Flex>
    );
}
