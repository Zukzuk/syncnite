import { useEffect, useMemo, useState } from "react";
import { InterLinkedDynamicGrid, InterLinkedGameItem, InterLinkedGrid } from "../../../types/interlinked";
import { AssociatedLayout } from "../../../types/app";

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
        needsColumnLayout: false,
        stacksWidth: 0,
        stackCardWidthUsed: 0,
    });

    const totalCards = useMemo(() => {
        if (!openDeck) return 0;
        return openDeck.items.reduce((acc, g) => acc + (g.coverUrl ? 1 : 0), 0);
    }, [openDeck?.key, openDeck?.items]);

    useEffect(() => {
        setLayout((): AssociatedLayout => {
            const deckColWidth = dynamicGrid.gridCardWidth + grid.gap * 2;

            const stackMaxCardWidth = dynamicGrid.stackCardWidth;
            const stackGap = grid.gap;
            const stackMinColWidth = stackMaxCardWidth + stackGap; // useful for “can fit at least 1 col”

            const deckStacksWidth = dynamicGrid.deckAndStacksWidth;
            const deckStacksHeight = dynamicGrid.deckAndStacksHeight;

            // Rules for deck vertical capacity
            const stepY = dynamicGrid.cardStepY;
            const maxCardsPerDeckColumnByHeight = Math.max(
                1,
                Math.floor((deckStacksHeight - dynamicGrid.deckCardHeight) / stepY) + 1
            );

            const neededDeckColumns = Math.max(
                1,
                Math.ceil(totalCards / maxCardsPerDeckColumnByHeight)
            );

            // Rules for layout decisions
            const detailsWidth = grid.coverWidth + grid.gap * 2;

            // Minimal right side is: 1 deck col + 1 stacks col, plus gaps between groups
            const minRightSideWidth = deckColWidth + stackMinColWidth;
            const minRowWidth = detailsWidth + minRightSideWidth + grid.gapMd * 2;

            const needsColumnLayout = dynamicGrid.gridViewportW < minRowWidth;

            // Rules for deck and stacks sizing differ based on row vs column layout
            const gapBetweenDeckAndStacks = openDeck ? grid.gapMd : 0;

            const widthAvailableForDeckInRow =
                deckStacksWidth - stackMinColWidth - gapBetweenDeckAndStacks;

            const maxDeckColumnsByWidth = Math.max(
                1,
                Math.floor(widthAvailableForDeckInRow / deckColWidth)
            );

            const deckColumns = Math.max(
                1,
                Math.min(neededDeckColumns, maxDeckColumnsByWidth)
            );

            const deckIsWidthLimited = deckColumns < neededDeckColumns;
            const maxCardsPerDeckColumn = deckIsWidthLimited ? 0 : maxCardsPerDeckColumnByHeight;

            // Rule: if column layout, deck takes all available width
            const stacksWidth = needsColumnLayout
                ? deckStacksWidth
                : Math.max(
                    0,
                    deckStacksWidth - deckColumns * deckColWidth - gapBetweenDeckAndStacks
                );

            // Rule: if no open deck, no stacks shown
            const stackColumns =
                stacksWidth <= 0
                    ? 0
                    : Math.max(1, Math.ceil((stacksWidth + stackGap) / (stackMaxCardWidth + stackGap)));

            const stackCardWidthUsed =
                stackColumns <= 0
                    ? 0
                    : Math.min(
                        stackMaxCardWidth,
                        Math.floor((stacksWidth - stackGap * (stackColumns - 1)) / stackColumns)
                    );

            return {
                deckColumns,
                stackColumns,
                maxCardsPerDeckColumn,
                needsColumnLayout,
                stacksWidth,
                stackCardWidthUsed,
            };
        });
    }, [openDeck?.key, totalCards, dynamicGrid]);

    return layout;
}
