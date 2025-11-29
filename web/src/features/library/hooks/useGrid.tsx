import { useMemo } from "react";
import { useGridLayout } from "./useGridLayout";
import { useGridVirtualWindow } from "./useGridVirtualWindow";
import { useGridAlphabetRail } from "./useGridAlphabetRail";
import { useGridOpenItemToggle } from "./useGridOpenItemToggle";
import { useGridScrollJump } from "./useGridScrollJump";
import { useGridScrollRestore } from "./useGridScrollRestore";
import { GameItem, GridRows, ItemPositions, Letter, RowLayout, UIDerivedState, UIState, ViewMode } from "../../../types/types";
import { GRID } from "../../../lib/constants";

type UseParams = {
    containerRef: React.RefObject<HTMLDivElement>;
    view: ViewMode;
    controlsH: number;
    headerH: number;
    ui: UIState;
    derived: UIDerivedState;
};

type UseReturn = {
    containerHeight: number;
    positions: { left: number; top: number }[];
    visibleRange: { startIndex: number; endIndex: number };
    railCounts: Record<Letter, number>;
    activeLetter: Letter;
    openWidth: string;
    openHeight: string;
    topOffset: number;
    openIds: Set<string>;
    onScrollJump: (letter: Letter) => void;
    onToggleItem: (id: string, index: number) => void;
};

// A hook to manage the absolute grid model: positions, virtual window, jump-to-scroll, alphabetical rail.
export function useGrid({
    containerRef,
    view,
    controlsH,
    headerH,
    ui,
    derived,
}: UseParams): UseReturn {
    // Total items length
    const itemsLen = derived.itemsSorted.length;
    // Base grid sizing (cols + viewport height)
    const { cols, viewportH } = useGridLayout({ containerRef, itemsLen });
    const colsSafe = view === "list" ? 1 : Math.max(1, cols || 1);

    // Combined header/controls offset
    const topOffset = controlsH + headerH;
    // Open card CSS + numeric height
    const openWidth = `calc(100vw - ${GRID.menuWidth}px - ${GRID.scrollbarWidth}px)`;
    const openHeight = `calc(100vh - ${topOffset}px)`;

    // Open/close state
    const { openIds, toggleOpen } = useGridOpenItemToggle();

    // Build grid rows with open items occupying dedicated full-width rows
    const { rowItems, rowIsOpen } = useMemo(
        () => buildGridRows(derived.itemsSorted, openIds, colsSafe),
        [derived.itemsSorted, openIds, colsSafe]
    );

    // Compute row layout
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
                viewportH,
                view,
            ),
        [rowItems, rowIsOpen, itemsLen, viewportH, view]
    );

    // Per-row first/last item indices
    const rowFirstItemIndex = useMemo(
        () => rowItems.map((row) => (row.length ? row[0] : 0)),
        [rowItems]
    );
    const rowLastItemIndex = useMemo(
        () => rowItems.map((row) => (row.length ? row[row.length - 1] + 1 : 0)),
        [rowItems]
    );
    // Compute absolute item positions
    const positions = useMemo(
        () => computeItemPositions(itemsLen, itemRowIndex, itemColIndex, rowTops),
        [itemsLen, itemRowIndex, itemColIndex, rowTops]
    );

    // Jump-to-scroll, based on positions
    const { scrollItemIntoView } = useGridScrollJump({
        containerRef,
        positions,
    });

    // Open/close behavior with scroll restore
    const { onToggleItem } = useGridScrollRestore({
        containerRef,
        openIds,
        items: derived.itemsSorted as GameItem[],
        scrollItemIntoView,
        toggleOpen: (id: string) => toggleOpen(id),
    });

    // Virtual window (variable-height rows)
    const { visibleRange } = useGridVirtualWindow({
        containerRef, opts: {
            rows: rowTops.length,
            cols: colsSafe,
            itemsLen,
            rowTops,
            rowHeights,
            containerHeight,
            viewportH,
            rowFirstItemIndex,
            rowLastItemIndex,
        }
    });

    const railVisibleIndex =
        visibleRange.endIndex > visibleRange.startIndex
            ? Math.floor((visibleRange.startIndex + visibleRange.endIndex - 1) / 2)
            : visibleRange.startIndex;

    // Alphabet rail (counts, active letter, jump handler)
    const { railCounts, activeLetter, onScrollJump } = useGridAlphabetRail({
        railVisibleIndex,
        itemsLen,
        ui,
        derived,
        scrollItemIntoView,
    });

    return {
        containerHeight,
        positions,
        visibleRange,
        railCounts,
        activeLetter,
        openWidth,
        openHeight,
        topOffset,
        openIds,
        onScrollJump,
        onToggleItem,
    } as const;
}

/**
 * Build rows for a grid with "open" items occupying a dedicated full-width row.
 */
function buildGridRows(items: GameItem[], openIds: Set<string>, colsSafe: number): GridRows {
    const itemsLen = items.length;
    const rows: number[][] = [];
    const rowIsOpen: boolean[] = [];

    let currentRow: number[] = [];

    for (let i = 0; i < itemsLen; i++) {
        const item = items[i];
        if (!item) continue;
        const isOpen = openIds.has(item.id);

        if (isOpen) {
            // flush partial row before inserting dedicated open row
            if (currentRow.length > 0) {
                rows.push(currentRow);
                rowIsOpen.push(false);
                currentRow = [];
            }
            rows.push([i]);
            rowIsOpen.push(true);
        } else {
            currentRow.push(i);
            if (currentRow.length === colsSafe) {
                rows.push(currentRow);
                rowIsOpen.push(false);
                currentRow = [];
            }
        }
    }

    // flush trailing partial row (closed)
    if (currentRow.length > 0) {
        rows.push(currentRow);
        rowIsOpen.push(false);
    }

    return { rowItems: rows, rowIsOpen };
}

/**
 * Compute per-row layout, including variable row heights.
 */
function computeRowLayout(rowItems: number[][], rowIsOpen: boolean[], itemsLen: number, viewportH: number, view: ViewMode): RowLayout {
    const rowCount = rowItems.length;
    const rowTops = new Array<number>(rowCount);
    const rowHeights = new Array<number>(rowCount);
    const itemRowIndex = new Array<number>(itemsLen);
    const itemColIndex = new Array<number>(itemsLen);

    const closedHeight = view === "list" ? GRID.rowHeight : GRID.cardHeight;
    let y = view === "list" ? 0 : GRID.gap;

    for (let r = 0; r < rowCount; r++) {
        rowTops[r] = y;
        const openHeight = Math.max(closedHeight, viewportH);
        const height = rowIsOpen[r] ? openHeight : closedHeight;
        rowHeights[r] = height;

        const indices = rowItems[r];
        for (let c = 0; c < indices.length; c++) {
            const idx = indices[c];
            itemRowIndex[idx] = r;
            itemColIndex[idx] = c;
        }

        y += height + (view === "list" ? 0 : GRID.gap);
    }

    const containerHeight =
        rowCount === 0
            ? GRID.gap * 2 + closedHeight
            : y - (view === "list" ? 0 : GRID.gap * 2);

    return {
        rowTops,
        rowHeights,
        containerHeight,
        itemRowIndex,
        itemColIndex,
    };
}

/**
 * Compute absolute item positions from row layout.
 */
function computeItemPositions(itemsLen: number, itemRowIndex: number[], itemColIndex: number[], rowTops: number[]): ItemPositions {
    const out: ItemPositions = new Array(itemsLen);
    const strideX = GRID.cardWidth + GRID.gap;

    for (let i = 0; i < itemsLen; i++) {
        const r = itemRowIndex[i];
        if (r == null) continue;

        const c = itemColIndex[i] ?? 0;
        out[i] = {
            left: GRID.gap + c * strideX,
            top: rowTops[r] ?? GRID.gap,
        };
    }

    return out;
}

