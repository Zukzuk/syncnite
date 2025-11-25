import { useLayoutEffect, useMemo, useRef, useState } from "react";

// A hook to calculate visible range in a virtual scrolling window.
// Supports variable row heights via rowTops + rowHeights and optional
// per-row item index mapping for uneven rows (e.g. open rows).
export function useVirtualWindow(
    containerRef: React.RefObject<HTMLDivElement>,
    opts: {
        overscan: { top: number; bottom: number };
        rows: number;
        cols: number;
        itemsLen: number;
        rowTops: number[]; // rowTop[row]
        rowHeights: number[]; // rowHeight[row]
        containerHeight: number;
        viewportH: number;
        // Optional: explicit mapping from row -> [firstItemIndex, lastItemIndexExclusive]
        rowFirstItemIndexPerRow?: number[];
        rowLastItemIndexExclusivePerRow?: number[];
    }
) {
    const {
        overscan,
        rows,
        cols,
        itemsLen,
        rowTops,
        rowHeights,
        containerHeight,
        viewportH,
        rowFirstItemIndexPerRow,
        rowLastItemIndexExclusivePerRow,
    } = opts;

    const [scrollTop, setScrollTop] = useState(0);
    const rafRef = useRef<number | null>(null);

    useLayoutEffect(() => {
        const el = containerRef.current;
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

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const maxScroll = Math.max(0, containerHeight - viewportH);
        if (el.scrollTop > maxScroll) {
            el.scrollTop = maxScroll;
        }

        setScrollTop(el.scrollTop);
    }, [containerHeight, viewportH, itemsLen]);

    const visibleRange = useMemo(() => {
        if (!rows || !cols) return { startIndex: 0, endIndex: 0 };

        const vTop = Math.max(0, scrollTop - overscan.top);
        const vBot = Math.min(
            containerHeight,
            scrollTop + viewportH + overscan.bottom
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
            rowFirstItemIndexPerRow &&
            rowLastItemIndexExclusivePerRow &&
            rowFirstItemIndexPerRow.length === rows &&
            rowLastItemIndexExclusivePerRow.length === rows;

        if (haveRowIndexMapping && startRow < endRowExclusive) {
            // ✅ Use real item indices per row (works with open rows / uneven row sizes)
            const firstRow = startRow;
            const lastRow = endRowExclusive - 1;

            startIndex = rowFirstItemIndexPerRow![firstRow] ?? 0;
            endIndex = rowLastItemIndexExclusivePerRow![lastRow] ?? startIndex;
        } else {
            // fallback: old behaviour assuming dense rows * cols
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
        overscan.top,
        overscan.bottom,
        containerHeight,
        viewportH,
        rows,
        cols,
        rowTops,
        rowHeights,
        itemsLen,
        rowFirstItemIndexPerRow,
        rowLastItemIndexExclusivePerRow,
    ]);

    return { scrollTop, visibleRange } as const;
}
