import { useMemo } from "react";
import { buildGridRows, computeRowLayout, computeItemPositions } from "../helpers";
import { useJumpToScroll } from "./useJumpToScroll";
import { useVirtualWindow } from "./useVirtualWindow";
import { useAlphabetRail } from "./useAlphabetRail";
import { AlphabeticalGroup, GameItem, Letter, ViewMode } from "../../../types/types";

type UseParams = {
    itemsSorted: GameItem[];
    flatItems: GameItem[];
    openIds: Set<string>;
    colsSafe: number;
    dynamicOpenHeight: number;
    baseClosedHeight: number;
    containerRef: React.RefObject<HTMLDivElement>;
    viewportH: number;
    isGrouped: boolean;
    alphabeticalGroups: AlphabeticalGroup[] | null;
    view: ViewMode;
};

type UseReturn = {
    containerHeight: number;
    positions: { left: number; top: number }[];
    visibleRange: { startIndex: number; endIndex: number };
    scrollItemIntoView: (index: number) => void;
    railCounts: Record<Letter, number>;
    activeLetter: Letter;
    handleJump: (letter: Letter) => void;
};

// A hook to manage the absolute grid model: positions, virtual window, jump-to-scroll, alphabetical rail.
export function useAbsoluteGridModel({
    itemsSorted,
    openIds,
    colsSafe,
    dynamicOpenHeight,
    baseClosedHeight,
    containerRef,
    viewportH,
    isGrouped,
    alphabeticalGroups,
    flatItems,
    view,
}: UseParams): UseReturn {
    const itemsLen = itemsSorted.length;

    // Rows with open items taking full rows
    const { rowItems, rowIsOpen } = useMemo(
        () => buildGridRows(itemsSorted, openIds, colsSafe),
        [itemsSorted, openIds, colsSafe]
    );

    // Per-row item index ranges for virtual window mapping
    const rowFirstItemIndexPerRow = useMemo(
        () => rowItems.map((row) => (row.length ? row[0] : 0)),
        [rowItems]
    );

    const rowLastItemIndexExclusivePerRow = useMemo(
        () => rowItems.map((row) => (row.length ? row[row.length - 1] + 1 : 0)),
        [rowItems]
    );

    // Row layout (tops, heights, containerHeight)
    const {
        rowTops,
        rowHeights,
        containerHeight,
        itemRowIndex,
        itemColIndex,
    } = useMemo(
        () =>
            computeRowLayout(
                rowItems,
                rowIsOpen,
                itemsLen,
                dynamicOpenHeight,
                baseClosedHeight,
                view,
            ),
        [rowItems, rowIsOpen, itemsLen, dynamicOpenHeight, baseClosedHeight, view]
    );

    // Item positions
    const positions = useMemo(
        () => computeItemPositions(itemsLen, itemRowIndex, itemColIndex, rowTops),
        [itemsLen, itemRowIndex, itemColIndex, rowTops]
    );

    // Jump-to-scroll, based on positions
    const { scrollItemIntoView } = useJumpToScroll({
        containerRef,
        positions,
    });

    // Virtual window (variable-height rows)
    const { visibleRange } = useVirtualWindow({
        containerRef, opts: {
            rows: rowTops.length,
            cols: colsSafe,
            itemsLen,
            rowTops,
            rowHeights,
            containerHeight,
            viewportH,
            rowFirstItemIndexPerRow,
            rowLastItemIndexExclusivePerRow,
        }
    });

    // Alphabet rail (counts, active letter, jump handler)
    const { railCounts, activeLetter, handleJump } = useAlphabetRail({
        isGrouped,
        alphabeticalGroups,
        flatItems,
        scrollItemIntoView,
        visibleStartIndex: visibleRange.startIndex,
        totalItems: itemsLen,
    });

    return {
        containerHeight,
        positions,
        visibleRange,
        scrollItemIntoView,
        railCounts,
        activeLetter,
        handleJump,
    } as const;
}
