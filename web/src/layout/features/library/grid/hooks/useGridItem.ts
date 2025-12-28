import { useCallback, useMemo } from "react";
import { InterLinkedDynamicGrid, InterLinkedGameItem, InterLinkedGrid } from "../../../../../types/interlinked";
import { HistoryNavMode, ItemPositions } from "../../../../../types/app";

type UseParams = {
    item: InterLinkedGameItem;
    index: number;
    isOpen: boolean;
    positions: ItemPositions;
    isListView: boolean;
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
    installedUpdatedAt?: string;
    onToggleItem: (id: string, navMode?: HistoryNavMode) => void;
};

type UseReturn = {
    cardLeft: number;
    cardTop: number;
    cardWidth: number;
    cardHeight: number;
    cardZIndex: number;
    onToggleClickBounded: (id?: string, navMode?: HistoryNavMode) => void;
};

// Hook to manage individual grid item positioning and toggle behavior.
export function useGridItem({
    item, index, isOpen, positions, isListView,
    grid, dynamicGrid, onToggleItem
}: UseParams): UseReturn {

    const {
        cardLeft,
        cardTop,
        cardWidth,
        cardHeight,
        cardZIndex,
    } = useMemo(() => {
        const pos = positions[index] ?? { left: grid.gap, top: grid.gap };
        const cardLeft = isOpen || isListView
            ? 0
            : pos.left;
        const cardTop = pos.top;
        const cardWidth =
            isOpen || isListView
                ? dynamicGrid.gridViewportW - grid.scrollbarWidth
                : dynamicGrid.gridCardWidth;
        const cardHeight =
            isOpen
                ? dynamicGrid.gridViewportH
                : isListView
                    ? grid.rowHeight
                    : dynamicGrid.gridCardHeight;
        const cardZIndex = isOpen
            ? grid.z.aboveBase
            : grid.z.base

        return {
            cardLeft,
            cardTop,
            cardWidth,
            cardHeight,
            cardZIndex,
        };
    }, [
        index,
        isOpen,
        isListView,
        positions,
        grid,
        dynamicGrid.gridViewportW,
        dynamicGrid.gridViewportH,
        dynamicGrid.gridCardWidth,
        dynamicGrid.gridCardHeight,
    ]);

    const onToggleClickBounded = useCallback(
        (id?: string, navMode?: HistoryNavMode) => {
            onToggleItem(id ?? item.id, navMode);
        },
        [onToggleItem, item.id]
    );

    return {
        cardLeft,
        cardTop,
        cardWidth,
        cardHeight,
        cardZIndex,
        onToggleClickBounded,
    };
}
