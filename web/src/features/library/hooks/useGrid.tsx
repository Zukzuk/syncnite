import { useMemo } from "react";
import { useGridLayout } from "./useGridLayout";
import { useGridVirtualWindow } from "./useGridVirtualWindow";
import { useGridAlphabetRail } from "./useGridAlphabetRail";
import { useGridOpenItemToggle } from "./useGridOpenItemToggle";
import { useGridScrollJump } from "./useGridScrollJump";
import { useGridScrollRestore } from "./useGridScrollRestore";
import { GameItem, GridRows, ItemPositions, Letter, RowLayout, UIDerivedState, UIState } from "../../../types/types";
import { GRID } from "../../../lib/constants";

type UseParams = {
    gridRef: React.RefObject<HTMLDivElement>;
    isListView: boolean;
    controlsH: number;
    sortH: number;
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
    openIds: Set<string>;
    hasOpenItemInView: boolean;
    onScrollJump: (letter: Letter) => void;
    onToggleItem: (id: string, index: number) => void;
    onAssociatedClick: (fromId: string, targetId: string) => void;
};

// A hook to manage the absolute grid model: positions, virtual window, jump-to-scroll, alphabetical rail.
export function useGrid({
    gridRef,
    isListView,
    controlsH,
    sortH,
    ui,
    derived,
}: UseParams): UseReturn {
    // Total items length
    const itemsLen = derived.itemsSorted.length;
    // Base grid sizing (cols + viewport height)
    const { cols, viewportH } = useGridLayout({ gridRef, itemsLen });
    const viewCols = isListView ? 1 : Math.max(1, cols || 1);

    // Combined header/controls offset
    const topOffset = controlsH + sortH;
    // Open card CSS + numeric height
    const openWidth = `calc(100vw - ${GRID.navBarWidth}px - ${GRID.scrollbarWidth}px)`;
    const openHeight = `calc(100vh - ${topOffset}px)`;

    // Open/close state
    const { openIds, toggleOpen } = useGridOpenItemToggle({ allowMultipleOpen: false });

    // Build id -> index map once per items change
    const idToIndex = useMemo(() => {
        const map = new Map<string, number>();
        derived.itemsSorted.forEach((item: GameItem, index: number) => {
            map.set(item.id, index);
        });
        return map;
    }, [derived.itemsSorted]);

    // Build grid rows with open items occupying dedicated full-width rows
    const { rowItems, rowIsOpen } = useMemo(
        () => buildGridRows(derived.itemsSorted, openIds, viewCols),
        [derived.itemsSorted, openIds, viewCols]
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
                isListView,
            ),
        [rowItems, rowIsOpen, itemsLen, viewportH, isListView]
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
        gridRef,
        positions,
    });

    // Open/close behavior with scroll restore
    const { onToggleItem } = useGridScrollRestore({
        gridRef,
        openIds,
        items: derived.itemsSorted as GameItem[],
        scrollItemIntoView,
        toggleOpen: (id: string) => toggleOpen(id),
    });

    const onAssociatedClick = (fromId: string, targetId: string) => {
        if (fromId === targetId) return;

        const items = derived.itemsSorted as GameItem[];

        const targetIndex = items.findIndex((g) => g.id === targetId);
        if (targetIndex === -1) return;

        // 1. Close the current collapse if it's open
        if (openIds.has(fromId)) {
            const fromIndex = items.findIndex((g) => g.id === fromId);
            if (fromIndex !== -1) {
                onToggleItem(fromId, fromIndex);
            }
        }

        // 2. Open the clicked item (3. scroll is handled by useGridScrollRestore)
        if (!openIds.has(targetId)) {
            onToggleItem(targetId, targetIndex);
        }
    };

    // Virtual window (variable-height rows)
    const { visibleRange } = useGridVirtualWindow({
        gridRef, opts: {
            rows: rowTops.length,
            cols: viewCols,
            itemsLen,
            rowTops,
            rowHeights,
            containerHeight,
            viewportH,
            rowFirstItemIndex,
            rowLastItemIndex,
        }
    });

    // Compute id -> index map once per items change
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

    // Open item must intersect viewport by >= minIntersection
    const hasOpenItemInView = useMemo(() => {
        if (isListView) return false;
        const el = gridRef.current;
        if (!el || openIds.size === 0) return false;

        const viewportTop = el.scrollTop;
        const viewportBottom = viewportTop + el.clientHeight;
        const MIN_INTERSECTION = 80; // tweak as needed

        for (const openId of openIds) {
            const idx = idToIndex.get(openId);
            if (idx == null) continue;

            const rowIdx = itemRowIndex[idx];
            if (rowIdx == null) continue;

            const top = rowTops[rowIdx] ?? GRID.gap;
            const height = rowHeights[rowIdx] ?? 0;
            const bottom = top + height;

            const intersection =
                Math.min(bottom, viewportBottom) - Math.max(top, viewportTop);

            if (intersection >= MIN_INTERSECTION) {
                return true;
            }
        }

        return false;
    }, [
        isListView,
        openIds,
        idToIndex,
        itemRowIndex,
        rowTops,
        rowHeights,
        gridRef,
        visibleRange.startIndex,
        visibleRange.endIndex,
    ]);

    return {
        containerHeight,
        positions,
        visibleRange,
        railCounts,
        activeLetter,
        openWidth,
        openHeight,
        openIds,
        hasOpenItemInView,
        onScrollJump,
        onToggleItem,
        onAssociatedClick,
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
function computeRowLayout(rowItems: number[][], rowIsOpen: boolean[], itemsLen: number, viewportH: number, isListView: boolean): RowLayout {
    const rowCount = rowItems.length;
    const rowTops = new Array<number>(rowCount);
    const rowHeights = new Array<number>(rowCount);
    const itemRowIndex = new Array<number>(itemsLen);
    const itemColIndex = new Array<number>(itemsLen);

    const closedHeight = isListView ? GRID.rowHeight : GRID.cardHeight;
    let y = isListView ? 0 : GRID.gap;

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

        y += height + (isListView ? 0 : GRID.gap);
    }

    const containerHeight =
        rowCount === 0
            ? GRID.gap * 2 + closedHeight
            : y - (isListView ? 0 : GRID.gap * 2);

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

