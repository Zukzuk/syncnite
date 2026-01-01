import { useEffect, useMemo, useState } from "react";
import { InterLinkedDynamicGrid, InterLinkedGameItem, InterLinkedGrid } from "../../../types/interlinked";
import { AssociatedLayout } from "../../../types/app";

type UseParams = {
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
    stackCount: number;
    openDeckData: { key: string; items: InterLinkedGameItem[] } | null;
};

type UseReturn = AssociatedLayout;

export function useAssociatedLayout({ grid, dynamicGrid, openDeckData, stackCount }: UseParams): UseReturn {
    const [layout, setLayout] = useState<AssociatedLayout>({
        deckColumns: 1,
        stackColumns: 1,
        maxCardsPerDeckColumn: 0,
        needsColumnLayout: false,
        stackCardWidthUsed: 0,
    });

    const totalCards = useMemo(() => {
        if (!openDeckData) return 0;
        return openDeckData.items.reduce((acc, g) => acc + (g.coverUrl ? 1 : 0), 0);
    }, [openDeckData?.key, openDeckData?.items]);

    useEffect(() => {
        setLayout((): AssociatedLayout => {
            // ---- small helpers ----
            const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
            const colsThatFit = (availableW: number, cardW: number, gap: number) =>
                Math.max(1, Math.floor((availableW + gap) / (cardW + gap)));

            // ---- base measurements ----
            const deckColWidth = dynamicGrid.gridCardWidth + grid.gap * 2;

            const stackMaxCardWidth = dynamicGrid.stackCardWidth;
            const stackGap = grid.gap;
            const stackMinColWidth = stackMaxCardWidth + stackGap; // “can fit at least 1 col”

            const deckStacksWidth = dynamicGrid.deckAndStacksWidth;
            const deckStacksHeight = dynamicGrid.deckAndStacksHeight;

            // ---- deck capacity rules (vertical) ----
            const stepY = dynamicGrid.cardStepY;
            const maxCardsPerDeckColumnByHeight =
                Math.max(1, Math.floor((deckStacksHeight - dynamicGrid.deckCardHeight) / stepY) + 1);

            const neededDeckColumns =
                Math.max(1, Math.ceil(totalCards / maxCardsPerDeckColumnByHeight));

            // ---- row/column layout decision ----
            const detailsWidth = grid.coverWidth + grid.gap * 2;

            const minRightSideWidth = deckColWidth + stackMinColWidth; // 1 deck col + 1 stacks col
            const minRowWidth = detailsWidth + minRightSideWidth + grid.gapMd * 2;

            const needsColumnLayout = dynamicGrid.gridViewportW < minRowWidth;

            // ---- width rules (deck + stacks) ----
            const gapBetweenDeckAndStacks = openDeckData ? grid.gapMd : 0;

            const widthAvailableForDeckInRow =
                deckStacksWidth - stackMinColWidth - gapBetweenDeckAndStacks;

            const maxDeckColumnsByWidth =
                Math.max(1, Math.floor(widthAvailableForDeckInRow / deckColWidth));

            const deckColumns =
                Math.max(1, Math.min(neededDeckColumns, maxDeckColumnsByWidth));

            const deckIsWidthLimited = deckColumns < neededDeckColumns;
            const maxCardsPerDeckColumn = deckIsWidthLimited ? 0 : maxCardsPerDeckColumnByHeight;

            const stacksWidth = needsColumnLayout
                ? deckStacksWidth
                : Math.max(0, deckStacksWidth - deckColumns * deckColWidth - gapBetweenDeckAndStacks);

            // If no open deck, no stacks shown (kept: original behavior effectively hides stacks via width/stackCount)
            const minStacksCols = deckColumns <= 1 ? 1 : 2;

            // ---- early exit: no stacks ----
            if (stacksWidth <= 0 || stackCount <= 0) {
                return {
                    deckColumns,
                    stackColumns: 0,
                    maxCardsPerDeckColumn,
                    needsColumnLayout,
                    stackCardWidthUsed: 0,
                };
            }

            // ---- stacks layout decision ----
            // How many columns fit at *max* stack card width?
            const colsFitAtMaxWidth = colsThatFit(stacksWidth, stackMaxCardWidth, stackGap);

            // Columns we'd like to render at max width (never exceed stackCount)
            const colsAtMaxWidth = Math.min(stackCount, colsFitAtMaxWidth);

            // Start with max-width behavior, respecting minimum columns (but never exceed stackCount)
            let stackColumns = Math.min(stackCount, Math.max(minStacksCols, colsAtMaxWidth));
            let stackCardWidthUsed = stackMaxCardWidth;

            // Case A: we forced minStacksCols but it doesn't fit at max width -> shrink to fit
            if (stackColumns > colsFitAtMaxWidth) {
                const widthPerCol = Math.floor(
                    (stacksWidth - stackGap * (stackColumns - 1)) / stackColumns
                );
                stackCardWidthUsed = clamp(widthPerCol, 1, stackMaxCardWidth);
            } else {
                // Case B: we fit at max width; see if we can add ONE extra used column by shrinking
                const usedWidthAtMax =
                    stackColumns * stackMaxCardWidth + (stackColumns - 1) * stackGap;

                const leftover = stacksWidth - usedWidthAtMax;

                const canAddUsedColumn = stackColumns < stackCount;
                if (leftover > 0 && canAddUsedColumn) {
                    const nextCols = stackColumns + 1;
                    const candidateWidth = Math.floor(
                        (stacksWidth - stackGap * (nextCols - 1)) / nextCols
                    );

                    // Only shrink if it actually shrinks and stays <= max (same as original)
                    if (candidateWidth > 0 && candidateWidth < stackMaxCardWidth) {
                        stackColumns = nextCols;
                        stackCardWidthUsed = candidateWidth;
                    }
                }
            }

            return {
                deckColumns,
                stackColumns,
                maxCardsPerDeckColumn,
                needsColumnLayout,
                stackCardWidthUsed,
            };
        });

    }, [openDeckData?.key, totalCards, stackCount, dynamicGrid]);

    return layout;
}
