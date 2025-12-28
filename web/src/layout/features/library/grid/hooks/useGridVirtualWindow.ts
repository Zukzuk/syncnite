import { RefObject, useLayoutEffect, useMemo, useRef, useState } from "react";
import { InterLinkedGrid } from "../../../../../types/interlinked";

type UseParams = {
    gridRef: RefObject<HTMLDivElement>;
    grid: InterLinkedGrid;
    rows: number;
    cols: number;
    itemsLen: number;
    rowTops: number[];
    rowHeights: number[];
    containerHeight: number;
    viewportH: number;
    rowFirstItemIndex?: number[];
    rowLastItemIndex?: number[];
};

type UseReturn = {
    scrollTop: number;
    visibleRange: {
        startIndex: number;
        endIndex: number;
    };
    syncScrollTopNow: () => void;
};

// Hook to manage virtual windowing for a grid layout
export function useGridVirtualWindow({ 
    gridRef, grid, rows, cols, itemsLen, rowTops, rowHeights, 
    containerHeight, viewportH, rowFirstItemIndex, rowLastItemIndex 
}: UseParams): UseReturn {
    const [scrollTop, setScrollTop] = useState(0);
    const rafRef = useRef<number | null>(null);

    // scroll handler
    useLayoutEffect(() => {
        const el = gridRef.current;
        if (!el) return;

        const onScroll = () => {
            if (rafRef.current != null) return;
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                setScrollTop(el.scrollTop);
            });
        };

        el.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            el.removeEventListener("scroll", onScroll);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // adjust scrollTop if containerHeight or itemsLen changes
    useLayoutEffect(() => {
        const el = gridRef.current;
        if (!el) return;

        const maxScroll = Math.max(0, containerHeight - viewportH);
        if (el.scrollTop > maxScroll) {
            el.scrollTop = maxScroll;
        }

        setScrollTop(el.scrollTop);
    }, [containerHeight, viewportH, itemsLen]);

    // compute visible range
    const visibleRange = useMemo(() => {
        if (!rows || !cols) return { startIndex: 0, endIndex: 0 };

        const vTop = Math.max(0, scrollTop - grid.overscan.top);
        const vBot = Math.min(
            containerHeight,
            scrollTop + viewportH + grid.overscan.bottom
        );

        // find first row whose bottom > vTop
        let startRow = 0;
        while (
            startRow < rows &&
            rowTops[startRow] + rowHeights[startRow] <= vTop
        ) {
            startRow++;
        }

        // find first row whose top >= vBot, that row is exclusive
        let endRowExclusive = startRow;
        while (endRowExclusive < rows && rowTops[endRowExclusive] < vBot) {
            endRowExclusive++;
        }

        let startIndex = 0;
        let endIndex = 0;

        const haveRowIndexMapping =
            rowFirstItemIndex &&
            rowLastItemIndex &&
            rowFirstItemIndex.length === rows &&
            rowLastItemIndex.length === rows;

        if (haveRowIndexMapping && startRow < endRowExclusive) {
            // real item indices per row (works with open rows / uneven row sizes)
            const firstRow = startRow;
            const lastRow = endRowExclusive - 1;

            startIndex = rowFirstItemIndex![firstRow] ?? 0;
            endIndex = rowLastItemIndex![lastRow] ?? startIndex;
        } else {
            // behaviour assuming dense rows * cols
            const colsSafe = Math.max(1, cols);
            startIndex = startRow * colsSafe;
            endIndex = endRowExclusive * colsSafe;
        }

        // clamp
        startIndex = Math.max(0, Math.min(itemsLen, startIndex));
        endIndex = Math.max(startIndex, Math.min(itemsLen, endIndex));

        return { startIndex, endIndex };
    }, [
        scrollTop,
        containerHeight,
        viewportH,
        rows,
        cols,
        rowTops,
        rowHeights,
        itemsLen,
        rowFirstItemIndex,
        rowLastItemIndex,
    ]);

    // function to sync scrollTop immediately
    const syncScrollTopNow = useMemo(() => {
        return () => {
            const el = gridRef.current;
            if (!el) return;
            // cancel any queued rAF update so we don't immediately overwrite
            if (rafRef.current != null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            setScrollTop(el.scrollTop);
        };
    }, [gridRef]);

    return { scrollTop, visibleRange, syncScrollTopNow }
}
