import { useEffect, useMemo, useRef, useState } from "react";
import { InterLinkedGameItem, InterLinkedGrid } from "../../../../../types/interlinked";
import { AssociatedLayout } from "../../../../../types/app";

type UseParams = {
    width: number;
    height: number;
    totalCards: number;
    grid: InterLinkedGrid;
};

type UseReturn = AssociatedLayout;

function calcAssociatedLayout({ width, height, totalCards, grid }: UseParams): UseReturn {
    if (!grid.cardWidth || !grid.cardHeight || !grid.stackWidth || !grid.stackHeight) {
        return {
            deckColumns: 0,
            stackColumns: 0,
            maxCardsPerDeckColumn: null,
            minStackColumns: 1,
        };
    }

    if (width <= 0 || height <= 0 || !totalCards) {
        return {
            deckColumns: 0,
            stackColumns:  Math.max(1, Math.floor(width / (grid.stackWidth))),
            maxCardsPerDeckColumn: null,
            minStackColumns: 1,
        };
    }

    const deckColWidth = grid.cardWidth + grid.gap * 2;
    const stackColWidth = grid.stackWidth + grid.gap;
    const cardHeight = grid.cardWidth * (1 / grid.ratio);
    const stepY = grid.cardStepY;
    const maxCardsPerColumnByHeight = Math.max(1, Math.floor((height - cardHeight) / stepY) + 1);
    const neededColsByHeight = Math.max(1, Math.ceil(totalCards / maxCardsPerColumnByHeight));

    let maxDeckColsByWidth = 0;

    for (let cols = 1; cols <= neededColsByHeight; cols++) {
        const minStackColsForCols = cols >= 6 ? 2 : 1;
        const usedWidthForDeck = cols * deckColWidth;
        const remainingWidth = width - usedWidthForDeck;

        if (remainingWidth < stackColWidth * minStackColsForCols) break;
        maxDeckColsByWidth = cols;
    }

    if (maxDeckColsByWidth === 0) {
        const deckColumns = 1;
        const minStackColumns = deckColumns >= 6 ? 2 : 1;
        const remainingWidth = width - deckColumns * deckColWidth;
        const stackColumns =
            remainingWidth >= stackColWidth
                ? Math.max(minStackColumns, Math.floor(remainingWidth / stackColWidth))
                : 0;

        return {
            deckColumns,
            stackColumns,
            maxCardsPerDeckColumn: null,
            minStackColumns,
        };
    }

    const deckColumns = Math.min(neededColsByHeight, maxDeckColsByWidth);
    const minStackColumns = deckColumns >= 6 ? 2 : 1;
    const hitWidthLimit = deckColumns < neededColsByHeight;
    const usedWidthForDeck = deckColumns * deckColWidth;
    const remainingWidth = width - usedWidthForDeck;
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
        maxCardsPerDeckColumn: hitWidthLimit ? null : maxCardsPerColumnByHeight,
        minStackColumns,
    };
}

type Args = {
    grid: InterLinkedGrid;
    openDeck: { key: string; items: InterLinkedGameItem[] } | null;
    /** extra right padding used by parent, so content width becomes rect.width - gapRight */
    gapRight: number;
};

const EMPTY_LAYOUT: AssociatedLayout = {
    deckColumns: 0,
    stackColumns: 0,
    maxCardsPerDeckColumn: null,
    minStackColumns: 1,
};

export function useAssociatedLayout({ grid, openDeck, gapRight }: Args) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [layout, setLayout] = useState<AssociatedLayout>({
        deckColumns: 1,
        stackColumns: 1,
        maxCardsPerDeckColumn: null,
        minStackColumns: 1,
    });

    const totalCards = useMemo(() => {
        if (!openDeck) return 0;
        return openDeck.items.reduce((acc, g) => acc + (g.coverUrl ? 1 : 0), 0);
    }, [openDeck?.key, openDeck?.items]);

    useEffect(() => {
        const el = ref.current;

        if (!el || !openDeck) {
            setLayout(EMPTY_LAYOUT);
            return;
        }

        const update = () => {
            const rect = el.getBoundingClientRect();
            const width = rect.width - gapRight;
            const height = rect.height;

            setLayout(calcAssociatedLayout({width, height, totalCards, grid}));
        };

        const ro = new ResizeObserver(update);
        ro.observe(el);
        update();

        return () => ro.disconnect();
        // totalCards already incorporates openDeck?.items, so you don’t need both key + length deps
    }, [openDeck?.key, totalCards, grid, gapRight]);

    return { layoutRef: ref, layout };
}
