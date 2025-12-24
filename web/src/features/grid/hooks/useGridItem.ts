import { useCallback, useMemo } from "react";
import { ItemPositions, NavMode } from "../../../types/app";
import { InterLinkedGameItem, InterLinkedGrid } from "../../../types/interlinked";

type UseParams = {
    item: InterLinkedGameItem;
    index: number;
    isOpen: boolean;
    positions: ItemPositions;
    isListView: boolean;
    cssOpenWidth: string;
    cssOpenHeight: string;
    grid: InterLinkedGrid;
    onToggleItem: (id: string, navMode?: NavMode) => void;
};

type UseReturn = {
    cardLeft: number | string;
    cardTop: number | string;
    cardWidth: string;
    cardHeight: string;
    cardZIndex: number;
    onToggleClickBounded: (id?: string, navMode?: NavMode) => void;
};

// Hook to manage individual grid item positioning and toggle behavior.
export function useGridItem({
    item, index, isOpen, positions, isListView,
    cssOpenWidth, cssOpenHeight, grid, onToggleItem
}: UseParams): UseReturn {

    const {
        cardLeft,
        cardTop,
        cardWidth,
        cardHeight,
        cardZIndex,
    } = useMemo(() => {
        const pos = positions[index] ?? { left: grid.gap, top: grid.gap };

        const cardWidth =
            isOpen || isListView
                ? `calc(${cssOpenWidth} - ${grid.scrollbarWidth}px)`
                : `calc(${grid.cardWidth}px)`;

        const cardHeight =
            isOpen
                ? cssOpenHeight
                : isListView
                    ? `calc(${grid.rowHeight}px)`
                    : `calc(${grid.cardHeight}px)`;

        return {
            cardLeft: isOpen || isListView ? 0 : pos.left,
            cardTop: pos.top,
            cardWidth,
            cardHeight,
            cardZIndex: isOpen ? grid.z.aboveBase : grid.z.base,
        };
    }, [
        index,
        isOpen,
        isListView,
        positions,
        cssOpenWidth,
        cssOpenHeight,
        grid,
    ]);

    const onToggleClickBounded = useCallback(
        (id?: string, navMode?: NavMode) => {
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
