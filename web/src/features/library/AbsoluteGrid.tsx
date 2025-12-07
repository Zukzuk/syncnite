import { useEffect, useRef } from "react";
import { Box } from "@mantine/core";
import { GridCard } from "./components/GridCard";
import { AlphabeticalRail } from "./components/AlphabeticalRail";
import { useGrid } from "./hooks/useGrid";
import { GRID, Z_INDEX, MAX_ASSOCIATED } from "../../lib/constants";
import { GameItem, ItemPositions, UIControls, UIDerivedData } from "../../types/types";

function calcCardPosition(
    index: number, 
    isOpen: boolean, 
    positions: ItemPositions, 
    isListView: boolean, 
    openWidth: string, 
    openHeight: string,
): {
    cardLeft: number;
    cardTop: number;
    cardWidth: number | string;
    cardHeight: number | string;
    cardZIndex: number;
} {
    const pos = positions[index] ?? { left: GRID.gap, top: GRID.gap };
    const cardWidth = isOpen || isListView 
        ? openWidth : GRID.cardWidth;
    const cardHeight = isOpen
        ? openHeight
        : isListView
            ? GRID.rowHeight
            : GRID.cardHeight;
    const cardLeft = isOpen || isListView 
        ? 0 : pos.left;
    const cardTop = pos.top;
    const cardZIndex = isOpen 
        ? Z_INDEX.aboveBase : Z_INDEX.base;

    return {
        cardLeft,
        cardTop,
        cardWidth,
        cardHeight,
        cardZIndex,
    };
}

function getAssociatedCards(isOpen: boolean, item: GameItem, all: GameItem[]) {
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
    ui: UIControls;
    derived: UIDerivedData;
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
    ui,
    derived,
    controlsH,
    sortH,
    setHasOpenItemInView,
}: Props) {
    const gridRef = useRef<HTMLDivElement | null>(null);
    const isListView = ui.view === "list";
    const { itemsSorted, itemsAssociated } = derived;

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
                            cardLeft, 
                            cardTop, 
                            cardWidth, 
                            cardHeight, 
                            cardZIndex,
                        } = calcCardPosition(
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
                        } = getAssociatedCards(
                            isOpen, 
                            item, 
                            itemsAssociated,
                        );

                        return (
                            <GridCard
                                key={`${item.id}|${installedUpdatedAt}`}
                                item={item}
                                index={index}
                                isOpen={isOpen}
                                openWidth={openWidth}
                                openHeight={openHeight}
                                isListView={isListView}
                                associatedBySeries={associatedSeries}
                                associatedByTags={associatedTags}
                                associatedByYear={associatedYear}
                                associatedByInstalled={associatedInstalled}
                                cardLeft={cardLeft}
                                cardTop={cardTop}
                                cardWidth={cardWidth}
                                cardHeight={cardHeight}
                                cardZIndex={cardZIndex}
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