import { useEffect, useMemo, useState } from "react";
import { InterLinkedDynamicGrid, InterLinkedGameItem, InterLinkedGrid } from "../../../types/interlinked";
import { AssociatedLayout } from "../../../types/app";

function calcAssociatedLayout({ totalCards, grid, dynamicGrid }: {
    totalCards: number;
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
}): AssociatedLayout {
    const deckColWidth = dynamicGrid.gridCardWidth + grid.gap * 2;
    const stackColWidth = dynamicGrid.stackCardWidth + grid.gap;
    const stepY = dynamicGrid.cardStepY;
    const maxCardsPerColumnByHeight = Math.max(1, Math.floor((dynamicGrid.deckAndStacksHeight - dynamicGrid.deckCardHeight) / stepY) + 1);
    const neededColsByHeight = Math.max(1, Math.ceil(totalCards / maxCardsPerColumnByHeight));

    let maxDeckColsByWidth = 0;

    for (let cols = 1; cols <= neededColsByHeight; cols++) {
        const minStackColsForCols = cols >= 6 ? 2 : 1;
        const usedWidthForDeck = cols * deckColWidth;
        const remainingWidth = dynamicGrid.deckAndStacksWidth - usedWidthForDeck;

        if (remainingWidth < stackColWidth * minStackColsForCols) break;
        maxDeckColsByWidth = cols;
    }

    if (maxDeckColsByWidth === 0) {
        const deckColumns = 1;
        const minStackColumns = deckColumns >= 6 ? 2 : 1;
        const remainingWidth = dynamicGrid.deckAndStacksWidth - deckColumns * deckColWidth;
        const stackColumns =
            remainingWidth >= stackColWidth
                ? Math.max(minStackColumns, Math.floor(remainingWidth / stackColWidth))
                : 0;

        return {
            deckColumns,
            stackColumns,
            maxCardsPerDeckColumn: 0,
        };
    }

    const deckColumns = Math.min(neededColsByHeight, maxDeckColsByWidth);
    const minStackColumns = deckColumns >= 6 ? 2 : 1;
    const hitWidthLimit = deckColumns < neededColsByHeight;
    const usedWidthForDeck = deckColumns * deckColWidth;
    const remainingWidth = dynamicGrid.deckAndStacksWidth - usedWidthForDeck;
    const maxStackColsByWidth = remainingWidth > 0 ? Math.floor(remainingWidth / stackColWidth) : 0;

    let stackColumns: number;

    if (maxStackColsByWidth <= 0) {
        stackColumns = 0;
    } else if (hitWidthLimit) {
        stackColumns = Math.max(minStackColumns, Math.min(deckColumns, maxStackColsByWidth));
    } else {
        stackColumns = Math.max(minStackColumns, maxStackColsByWidth);
    }

    return {
        deckColumns,
        stackColumns,
        maxCardsPerDeckColumn: hitWidthLimit ? 0 : maxCardsPerColumnByHeight,
    };
}

type UseParams = {
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
    openDeck: { key: string; items: InterLinkedGameItem[] } | null;
};

type UseReturn = AssociatedLayout;

export function useAssociatedLayout({ grid, dynamicGrid, openDeck }: UseParams): UseReturn {
    const [layout, setLayout] = useState<AssociatedLayout>({
        deckColumns: 1,
        stackColumns: 1,
        maxCardsPerDeckColumn: 0,
    });

    const totalCards = useMemo(() => {
        if (!openDeck) return 0;
        return openDeck.items.reduce((acc, g) => acc + (g.coverUrl ? 1 : 0), 0);
    }, [openDeck?.key, openDeck?.items]);

    useEffect(() => {
        setLayout(calcAssociatedLayout({ totalCards, grid, dynamicGrid }));
    }, [openDeck?.key, totalCards, dynamicGrid]);

    return layout;
}
