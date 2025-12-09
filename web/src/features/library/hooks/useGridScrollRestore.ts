import { useCallback, useEffect, useRef, useState } from "react";
import { GameItem } from "../../../types/types";
import { GRID } from "../../../lib/constants";

type UseParams = {
    gridRef: React.RefObject<HTMLDivElement | null>;
    openIds: Set<string>;
    items: GameItem[];
    viewportH: number;
    closedHeight: number;
    openRowHeight: number;
    itemRowIndex: number[];
    rowTops: number[];
    isListView: boolean;
    scrollItemIntoView: (index: number) => void;
    toggleOpen: (id: string) => void;
};

type UseReturn = {
    onToggleItem: (id: string, absoluteIndex: number) => void;
};

// Hook to manage scroll position restoration when opening/closing items in the grid
export function useGridScrollRestore({
    gridRef,
    openIds,
    items,
    scrollItemIntoView,
    toggleOpen,
    viewportH,
    closedHeight,
    openRowHeight,
    itemRowIndex,
    rowTops,
    isListView,
}: UseParams): UseReturn {
    const preOpenScrollTopRef = useRef<number | null>(null);
    const openItemIdRef = useRef<string | null>(null);
    const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(null);

    const onToggleItem = useCallback(
        (id: string, absoluteIndex: number) => {
            const willOpen = !openIds.has(id);
            const el = gridRef.current;
            
            if (!el) return;

            if (willOpen) {
                console.log("OPENING", id);
                
                // OPEN:
                // store pre-open scroll lock and remember which item we opened
                preOpenScrollTopRef.current = el.scrollTop;
                openItemIdRef.current = id;

                toggleOpen(id);
                setPendingScrollIndex(absoluteIndex);
            } else {
                console.log("CLOSING", id);
                // CLOSE:
                const lock = preOpenScrollTopRef.current;
                const rowIdx = itemRowIndex[absoluteIndex];

                // Reset bookkeeping regardless of branch
                openItemIdRef.current = null;
                preOpenScrollTopRef.current = null;

                if (rowIdx == null) {
                    // No row info – just toggle and bail
                    toggleOpen(id);
                    return;
                }

                const rowTop = rowTops[rowIdx] ?? 0;
                const rowBottom = rowTop + openRowHeight;

                const viewTop = el.scrollTop;
                const viewBottom = viewTop + viewportH;
                const delta = openRowHeight - closedHeight;

                toggleOpen(id);

                if (lock == null) {
                    console.log("  no lock stored");
                    // No lock stored, nothing special to do
                    return;
                }

                if (rowTop < viewTop) {
                    console.log("  open row ABOVE viewport");
                    // Open row is ABOVE the viewport:
                    // LIST VIEW: this row is the item row; align it to the top
                    // GRID VIEW: open item had its own row; when we close,
                    // the closed row will be one row higher, so target rowIdx - 1.
                    if (isListView) {
                        el.scrollTop = rowTop;
                    } else {
                        const prevRowIdx = Math.max(0, rowIdx - 1);
                        const prevRowTop = rowTops[prevRowIdx] ?? rowTop;
                        el.scrollTop = prevRowTop - GRID.gap;
                    }
                } else if (rowBottom > viewBottom) {
                    console.log("  open row BELOW viewport");
                    // Open row is BELOW the viewport:
                    // collapsing it doesn't affect what we see, keep offset
                    el.scrollTop = viewTop;
                } else {
                    console.log("  open row INSIDE viewport");
                    // Default: row intersects viewport in the "normal" way:
                    // go back to the locked offset from before opening
                    el.scrollTop = lock;
                }
            }
        },
        [
            gridRef,
            openIds,
            toggleOpen,
            viewportH,
            closedHeight,
            openRowHeight,
            itemRowIndex,
            rowTops,
            isListView,
        ]
    );

    // Perform scroll after layout updated for the opened item
    useEffect(() => {
        if (pendingScrollIndex == null) return;

        const idx = pendingScrollIndex;
        const item = items[idx];

        if (!item || !openIds.has(item.id)) {
            setPendingScrollIndex(null);
            return;
        }

        scrollItemIntoView(idx);
        setPendingScrollIndex(null);
    }, [pendingScrollIndex, items, openIds, scrollItemIntoView]);

    return { onToggleItem };
}
