import { useEffect, useRef } from "react";
import { Box } from "@mantine/core";
import { GridCard } from "./components/GridCard";
import { AlphabeticalRail } from "./components/AlphabeticalRail";
import { useGrid } from "./hooks/useGrid";
import { GRID, Z_INDEX, MAX_ASSOCIATED } from "../../lib/constants";
import { GameItem, ViewMode, UIState, UIDerivedState, ItemPositions } from "../../types/types";

function calculatePositions(
    index: number, 
    isOpen: boolean, 
    positions: ItemPositions, 
    isListView: boolean, 
    openWidth: string, 
    openHeight: string,
) {
    const pos = positions[index] ?? { left: GRID.gap, top: GRID.gap };
    const containerWidth = isOpen || isListView 
        ? openWidth : GRID.cardWidth;
    const containerHeightItem = isOpen
        ? openHeight
        : isListView
            ? GRID.rowHeight
            : GRID.cardHeight;
    const containerLeft = isOpen || isListView 
        ? 0 : pos.left;
    const containerTop = pos.top;
    const containerZIndex = isOpen 
        ? Z_INDEX.aboveBase : Z_INDEX.base;

    return {
        containerLeft,
        containerTop,
        containerWidth,
        containerHeightItem,
        containerZIndex,
    };
}

function getRelated(isOpen: boolean, item: GameItem, all: GameItem[]) {
    const associatedSeries: GameItem[] = [];
    const associatedTags: GameItem[] = [];
    const associatedYear: GameItem[] = [];
    const associatedInstalled: GameItem[] = [];

    if (!isOpen) {
        return {
            associatedSeries,
            associatedInstalled,
            associatedTags,
            associatedYear,
        };
    }

    const seriesSet = item.series ? new Set(item.series) : null;
    const tagsSet = item.tags ? new Set(item.tags) : null;

    for (let i = 0; i < all.length; i++) {
        const other = all[i];

        if (seriesSet &&
            associatedSeries.length < MAX_ASSOCIATED &&
            other.series &&
            other.series.some(s => seriesSet.has(s))
        ) {
            associatedSeries.push(other);
        }

        if (tagsSet &&
            associatedTags.length < MAX_ASSOCIATED &&
            other.tags &&
            other.tags.some(t => tagsSet.has(t))
        ) {
            associatedTags.push(other);
        }

        if (item.year &&
            associatedYear.length < MAX_ASSOCIATED &&
            other.year === item.year
        ) {
            associatedYear.push(other);
        }

        if (item.isInstalled &&
            associatedInstalled.length < MAX_ASSOCIATED &&
            other.isInstalled
        ) {
            associatedInstalled.push(other);
        }

        // Early stop if all filled
        if ((!seriesSet || associatedSeries.length >= MAX_ASSOCIATED) &&
            (!tagsSet || associatedTags.length >= MAX_ASSOCIATED) &&
            (associatedYear.length >= MAX_ASSOCIATED) &&
            (associatedInstalled.length >= MAX_ASSOCIATED)
        ) {
            break;
        }
    }

    return {
        associatedSeries,
        associatedInstalled,
        associatedTags,
        associatedYear,
    };
}

type Props = {
    installedUpdatedAt?: string;
    view: ViewMode;
    ui: UIState;
    derived: UIDerivedState;
    controlsH: number;
    sortH: number;
    setHasOpenItemInView: (value: boolean) => void;
};

/**
 * Child responsible for scroll/virtual-window + grid rendering.
 * Keeps scroll-driven re-renders away from the header.
 */
export function AbsoluteGrid({
    installedUpdatedAt,
    view,
    ui,
    derived,
    controlsH,
    sortH,
    setHasOpenItemInView,
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
        setHasOpenItemInView(hasOpenItemInView);
    }, [hasOpenItemInView, setHasOpenItemInView]);

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
                        const isOpen = openIds.has(item.id);

                        const { 
                            containerLeft, 
                            containerTop, 
                            containerWidth, 
                            containerHeightItem, 
                            containerZIndex,
                        } = calculatePositions(
                            index, 
                            isOpen, 
                            positions, 
                            isListView, 
                            openWidth,
                            openHeight,
                        );
                        const { 
                            associatedSeries, 
                            associatedTags, 
                            associatedYear, 
                            associatedInstalled,
                        } = getRelated(
                            isOpen, 
                            item, 
                            itemsSorted,
                        );

                        return (
                            <GridCard
                                key={String(item.id)}
                                item={item}
                                index={index}
                                isOpen={isOpen}
                                openHeight={openHeight}
                                isListView={isListView}
                                associatedBySeries={associatedSeries}
                                associatedByTags={associatedTags}
                                associatedByYear={associatedYear}
                                associatedByInstalled={associatedInstalled}
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
                    railCounts={railCounts}
                    onScrollJump={onScrollJump}
                />
            )}
        </>
    );
}