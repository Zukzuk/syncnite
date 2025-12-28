import { useMemo } from "react";
import { InterLinkedDynamicGrid, InterLinkedGameItem, InterLinkedGrid } from "../../../../../types/interlinked";
import { DeckCardMeta } from "../../../../../types/app";

type UseParams = {
    items: InterLinkedGameItem[];
    deckColumns: number;
    maxCardsPerColumn: number | null;
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
};

type UseReturn = {
    cards: InterLinkedGameItem[];
    colCount: number;
    width: number;
    columnHeight: number;
    cardMeta: DeckCardMeta[];
    colLengths: number[];
};

export function useAssociatedDeckLayout({ items, deckColumns, maxCardsPerColumn, grid, dynamicGrid }: UseParams): UseReturn {
    return useMemo(() => {
        const cards = items.filter((g) => g.coverUrl);
        const colCount = Math.max(1, deckColumns);
        const total = cards.length;

        let cardsPerColumn: number;
        if (maxCardsPerColumn && maxCardsPerColumn > 0) {
            const maxTotalCapacity = colCount * maxCardsPerColumn;
            if (total <= maxTotalCapacity) {
                cardsPerColumn = Math.min(maxCardsPerColumn, Math.ceil(total / colCount));
            } else {
                cardsPerColumn = Math.ceil(total / colCount);
            }
        } else {
            cardsPerColumn = Math.ceil(total / colCount);
        }

        const cardHeight = dynamicGrid.gridCardWidth * (1 / grid.ratio);
        const columnHeight =
            cardsPerColumn > 0 ? cardHeight + grid.cardStepY * (cardsPerColumn - 1) : 0;

        const cardMeta: DeckCardMeta[] = cards.map((c, index) => {
            const colIndex = Math.floor(index / cardsPerColumn);
            const indexInColumn = index % cardsPerColumn;
            return { id: c.id, metaIndex: index, colIndex, indexInColumn };
        });

        const colLengths: number[] = Array.from({ length: colCount }, () => 0);
        cardMeta.forEach((m) => {
            colLengths[m.colIndex] = Math.max(colLengths[m.colIndex] || 0, m.indexInColumn + 1);
        });

        const width = colCount * (dynamicGrid.gridCardWidth + grid.gap * 2) + grid.gap * 2;

        return {
            cards,
            colCount,
            width,
            columnHeight,
            cardMeta,
            colLengths,
        };
    }, [items, deckColumns, maxCardsPerColumn, dynamicGrid.gridCardWidth]);
}
