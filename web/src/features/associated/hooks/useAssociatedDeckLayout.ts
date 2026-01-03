import { useMemo } from "react";
import { InterLinkedDynamicGrid, InterLinkedItem, InterLinkedGrid } from "../../../types/interlinked";
import { AssociatedIDeckMeta } from "../../../types/app";

type UseParams = {
    cards: InterLinkedItem[];
    deckColumns: number;
    maxCardsPerColumn: number | null;
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
};

type UseReturn = {
    colCount: number;
    deckWidth: number;
    columnHeight: number;
    cardMeta: AssociatedIDeckMeta[];
    colLengths: number[];
};

export function useAssociatedDeckLayout({ cards, deckColumns, maxCardsPerColumn, grid, dynamicGrid }: UseParams): UseReturn {
    return useMemo(() => {
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

        const columnHeight =
            cardsPerColumn > 0 ? dynamicGrid.deckCardHeight + dynamicGrid.cardStepY * (cardsPerColumn - 1) : 0;

        const cardMeta: AssociatedIDeckMeta[] = cards.map((c, index) => {
            const colIndex = Math.floor(index / cardsPerColumn);
            const indexInColumn = index % cardsPerColumn;
            return { id: c.id, metaIndex: index, colIndex, indexInColumn };
        });

        const colLengths: number[] = Array.from({ length: colCount }, () => 0);
        cardMeta.forEach((m) => {
            colLengths[m.colIndex] = Math.max(colLengths[m.colIndex] || 0, m.indexInColumn + 1);
        });

        const deckWidth = colCount * (dynamicGrid.gridCardWidth + grid.gap * 2) + grid.gap * 2;

        return {
            colCount,
            deckWidth,
            columnHeight,
            cardMeta,
            colLengths,
        };
    }, [cards, deckColumns, maxCardsPerColumn, dynamicGrid.gridCardWidth]);
}
