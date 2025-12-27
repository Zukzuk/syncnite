import { useMemo } from "react";
import { InterLinkedGameItem, InterLinkedGrid } from "../../../../../types/interlinked";
import { DeckCardMeta } from "../../../../../types/app";

type UseParams = {
    items: InterLinkedGameItem[];
    deckColumns: number;
    maxCardsPerColumn: number | null;
    grid: InterLinkedGrid;
};

type UseReturn = {
    cards: InterLinkedGameItem[];
    colCount: number;
    width: number;
    columnHeight: number;
    cardMeta: DeckCardMeta[];
    colLengths: number[];
};

export function useAssociatedDeckLayout({ items, deckColumns, maxCardsPerColumn, grid }: UseParams): UseReturn {
    return useMemo(() => {
        if (!grid.cardWidth || !grid.cardHeight) {
            return {
                cards: [],
                colCount: 0,
                width: 0,
                columnHeight: 0,
                cardMeta: [],
                colLengths: [],
            };
        }
        
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

        const cardHeight = grid.cardWidth * (1 / grid.ratio);
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

        const width = colCount * (grid.cardWidth + grid.gap * 2) + grid.gap * 2;

        return {
            cards,
            colCount,
            width,
            columnHeight,
            cardMeta,
            colLengths,
        };
    }, [items, deckColumns, maxCardsPerColumn, grid.cardWidth, grid.cardStepY, grid.gap, grid.ratio]);
}
