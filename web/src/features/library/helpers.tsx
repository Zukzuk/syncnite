import { GRID } from "../../lib/constants";
import { GameItem, GridRows, ItemPositions, RowLayout, ViewMode } from "../../types/types";

/**
 * Build rows for a grid with "open" items occupying a dedicated full-width row.
 */
export function buildGridRows(items: GameItem[], openIds: Set<string>, colsSafe: number): GridRows {
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
export function computeRowLayout(rowItems: number[][], rowIsOpen: boolean[], itemsLen: number, dynamicOpenHeight: number, baseClosedHeight: number, view: ViewMode): RowLayout {
    const rowCount = rowItems.length;
    const rowTops = new Array<number>(rowCount);
    const rowHeights = new Array<number>(rowCount);
    const itemRowIndex = new Array<number>(itemsLen);
    const itemColIndex = new Array<number>(itemsLen);

    let y = view === "list" ? 0 : GRID.padding;

    for (let r = 0; r < rowCount; r++) {
        rowTops[r] = y;
        const height = rowIsOpen[r] ? dynamicOpenHeight : baseClosedHeight;
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
            ? GRID.padding * 2 + baseClosedHeight
            : y - (view === "list" ? 0 : GRID.gap + GRID.padding);

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
export function computeItemPositions( itemsLen: number, itemRowIndex: number[], itemColIndex: number[], rowTops: number[]): ItemPositions {
    const out: ItemPositions = new Array(itemsLen);
    const strideX = GRID.cardWidth + GRID.gap;

    for (let i = 0; i < itemsLen; i++) {
        const r = itemRowIndex[i];
        if (r == null) continue;

        const c = itemColIndex[i] ?? 0;
        out[i] = {
            left: GRID.padding + c * strideX,
            top: rowTops[r] ?? GRID.padding,
        };
    }

    return out;
}
