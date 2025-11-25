import { useLayoutEffect, useMemo, useRef, useState } from "react";

// A hook to calculate visible range in a virtual scrolling window.
// Now supports variable row heights via rowTops + rowHeights.
export function useVirtualWindow(
    containerRef: React.RefObject<HTMLDivElement>,
    opts: {
        overscan: { top: number; bottom: number };
        rows: number;
        cols: number;
        itemsLen: number;
        rowTops: number[];      // rowTop[row]
        rowHeights: number[];   // rowHeight[row]
        containerHeight: number;
        viewportH: number;
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

        const colsSafe = Math.max(1, cols);
        const startIndex = Math.min(itemsLen, startRow * colsSafe);
        const endIndex = Math.min(itemsLen, endRowExclusive * colsSafe);

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
    ]);

    return { scrollTop, visibleRange } as const;
}
