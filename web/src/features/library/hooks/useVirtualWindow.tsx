import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { GRID } from "../../../lib/constants";

type UseParams = {
    containerRef: React.RefObject<HTMLDivElement>;
    opts: {
        rows: number;
        cols: number;
        itemsLen: number;
        rowTops: number[];
        rowHeights: number[];
        containerHeight: number;
        viewportH: number;
        rowFirstItemIndexPerRow?: number[];
        rowLastItemIndexExclusivePerRow?: number[];
    };
};

type UseReturn = {
    scrollTop: number;
    visibleRange: {
        startIndex: number;
        endIndex: number;
    };
};

// A hook to calculate visible range in a virtual scrolling window.
// Supports variable row heights via rowTops + rowHeights and optional
// per-row item index mapping for uneven rows (e.g. open rows).
export function useVirtualWindow({ containerRef, opts }: UseParams): UseReturn {
    const {
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

    // scroll handler
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

    // adjust scrollTop if containerHeight or itemsLen changes
    useLayoutEffect(() => {
        const el = containerRef.current;
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

        const vTop = Math.max(0, scrollTop - GRID.overscan.top);
        const vBot = Math.min(
            containerHeight,
            scrollTop + viewportH + GRID.overscan.bottom
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
            // real item indices per row (works with open rows / uneven row sizes)
            const firstRow = startRow;
            const lastRow = endRowExclusive - 1;

            startIndex = rowFirstItemIndexPerRow![firstRow] ?? 0;
            endIndex = rowLastItemIndexExclusivePerRow![lastRow] ?? startIndex;
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
        rowFirstItemIndexPerRow,
        rowLastItemIndexExclusivePerRow,
    ]);

    return { scrollTop, visibleRange } as const;
}
