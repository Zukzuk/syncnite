import { useEffect, useRef } from "react";
import { Box } from "@mantine/core";
import { ItemExpandable } from "./components/ItemExpandable";
import { AlphabeticalRail } from "./components/AlphabeticalRail";
import { useGrid } from "./hooks/useGrid";
import { GRID, Z_INDEX, MAX_ASSOCIATED } from "../../lib/constants";
import { GameItem, ViewMode, UIState, UIDerivedState } from "../../types/types";

function intersectsArrayWithSet(
    arr: string[] | null | undefined,
    set: Set<string>
): boolean {
    if (!arr || arr.length === 0) return false;
    for (let i = 0; i < arr.length; i++) {
        if (set.has(arr[i])) return true;
    }
    return false;
}

function getRelatedBySeries(isOpen: boolean, item: GameItem, all: GameItem[]): GameItem[] {
    if (!isOpen || !item.series || item.series.length === 0) return [];

    const seriesSet = new Set(item.series);

    return all
        .filter(
            (other) =>
                !!other.coverUrl &&
                intersectsArrayWithSet(other.series, seriesSet)
        )
        .slice(0, MAX_ASSOCIATED);
}

function getRelatedByTags(isOpen: boolean, item: GameItem, all: GameItem[]): GameItem[] {
    if (!isOpen || !item.tags || item.tags.length === 0) return [];

    const tagsSet = new Set(item.tags);

    return all
        .filter(
            (other) =>
                !!other.coverUrl &&
                intersectsArrayWithSet(other.tags, tagsSet)
        )
        .slice(0, MAX_ASSOCIATED);
}

function getRelatedByYear(isOpen: boolean, item: GameItem, all: GameItem[]): GameItem[] {
    if (!isOpen || !item.year) return [];
    return all
        .filter(
            (other) =>
                !!other.coverUrl &&
                other.year === item.year
        )
        .slice(0, MAX_ASSOCIATED);
}

/**
 * Child responsible for scroll/virtual-window + grid rendering.
 * Keeps scroll-driven re-renders away from the header.
 */
type Props = {
    installedUpdatedAt?: string;
    view: ViewMode;
    ui: UIState;
    derived: UIDerivedState;
    controlsH: number;
    sortH: number;
    onOpenItemVisibilityChange?: (value: boolean) => void;
};

export function LibraryGridItems({
    installedUpdatedAt,
    view,
    ui,
    derived,
    controlsH,
    sortH,
    onOpenItemVisibilityChange,
}: Props) {
    const gridRef = useRef<HTMLDivElement | null>(null);
    const isListView = view === "list";
    const { itemsSorted } = derived;

    const {
        containerHeight,
        positions,
        visibleRange,
        railCounts,
        activeLetter,
        openWidth,
        openHeight,
        openIds,
        hasOpenItemInView,
        onScrollJump,
        onToggleItem,
        onAssociatedClick,
    } = useGrid({
        gridRef,
        isListView,
        controlsH,
        sortH,
        ui,
        derived,
    });

    // Bubble visibility of any open item up to the parent
    useEffect(() => {
        onOpenItemVisibilityChange?.(hasOpenItemInView);
    }, [hasOpenItemInView, onOpenItemVisibilityChange]);

    return (
        <>
            <Box
                ref={gridRef}
                key={installedUpdatedAt ?? "initial"}
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
                    style={{
                        width: "100%",
                        height: containerHeight,
                    }}
                />

                {itemsSorted
                    .slice(visibleRange.startIndex, visibleRange.endIndex)
                    .map((item: GameItem, i: number) => {
                        const index = visibleRange.startIndex + i;
                        const pos = positions[index] ?? { left: GRID.gap, top: GRID.gap };
                        const isOpen = openIds.has(item.id);

                        const containerWidth =
                            isOpen || isListView ? openWidth : GRID.cardWidth;
                        const containerHeightItem = isOpen
                            ? openHeight
                            : isListView
                                ? GRID.rowHeight
                                : GRID.cardHeight;

                        const containerLeft = isOpen || isListView ? 0 : pos.left;
                        const containerTop = pos.top;
                        const containerZIndex = isOpen ? Z_INDEX.aboveBase : Z_INDEX.base;

                        const relatedBySeries = getRelatedBySeries(isOpen, item, itemsSorted);
                        const relatedByTags = getRelatedByTags(isOpen, item, itemsSorted);
                        const relatedByYear = getRelatedByYear(isOpen, item, itemsSorted);

                        return (
                            <ItemExpandable
                                key={String(item.id)}
                                item={item}
                                index={index}
                                isOpen={isOpen}
                                openHeight={openHeight}
                                isListView={isListView}
                                relatedBySeries={relatedBySeries}
                                relatedByTags={relatedByTags}
                                relatedByYear={relatedByYear}
                                containerLeft={containerLeft}
                                containerTop={containerTop}
                                containerWidth={containerWidth}
                                containerHeight={containerHeightItem}
                                containerZIndex={containerZIndex}
                                onToggleItem={onToggleItem}
                                onAssociatedClick={onAssociatedClick}
                            />
                        );
                    })}
            </Box>

            {ui.sortKey === "title" && (
                <AlphabeticalRail
                    activeLetter={activeLetter}
                    onScrollJump={onScrollJump}
                    railCounts={railCounts}
                />
            )}
        </>
    );
}