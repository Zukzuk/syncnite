import { useCallback } from "react";
import { ItemPositions, NavMode } from "../../../types/app";
import { InterLinkedGrid, InterLinkedGameItem } from "../../../types/interlinked";

type UseParams = {
    item: InterLinkedGameItem;
    index: number,
    isOpen: boolean,
    positions: ItemPositions,
    isListView: boolean,
    openWidth: string,
    openHeight: string,
    grid: InterLinkedGrid,
    onToggleItem: (id: string, navMode?: NavMode) => void,
};

type UseReturn = {
    cardLeft: number;
    cardTop: number;
    cardWidth: number | string;
    cardHeight: number | string;
    cardZIndex: number;
    onToggleClickBounded: (id?: string, navMode?: NavMode) => void;
};

// A hook to calculate the position and size of a grid item.
export function useGridItem({
    item, index, isOpen, positions, isListView, openWidth, openHeight, grid, onToggleItem
}: UseParams): UseReturn {
    const pos = positions[index] ?? { left: grid.gap, top: grid.gap };
    const cardWidth = isOpen || isListView ? openWidth : grid.cardWidth;
    const cardHeight = isOpen
        ? openHeight
        : isListView
            ? grid.rowHeight
            : grid.cardHeight;
    const cardTop = pos.top;
    const cardLeft = isOpen || isListView ? 0 : pos.left;
    const cardZIndex = isOpen ? grid.z.aboveBase : grid.z.base;

    // Bounded onToggleItem to this item's ID if no ID is provided.
    const onToggleClickBounded = useCallback(
        (id?: string, navMode?: NavMode) => {
            const target = id ?? item.id;
            onToggleItem(target, navMode);
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