import { useLayoutEffect, useMemo, useRef, useState } from "react";

/** Hook to manage a virtual window for large lists */
export function useVirtualWindow(
    containerRef: React.RefObject<HTMLDivElement>,
    opts: {
        overscan: { top: number; bottom: number };
        padding: number;
        strideY: number;
        cols: number;
        itemsLen: number;
        containerHeight: number;
        viewportH: number;
    }
) {
    const { overscan, padding, strideY, cols, itemsLen, containerHeight, viewportH } = opts;
    const [scrollTop, setScrollTop] = useState(0);
    const rafRef = useRef<number | null>(null);

    useLayoutEffect(() => {
        const el = containerRef.current; if (!el) return;
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

    const visibleRange = useMemo(() => {
        const vTop = Math.max(0, scrollTop - overscan.top);
        const vBot = Math.min(containerHeight, scrollTop + viewportH + overscan.bottom);
        const startRow = Math.max(0, Math.floor((vTop - padding) / strideY));
        const endRow = Math.max(startRow, Math.floor((vBot - padding) / strideY));
        const startIndex = Math.min(itemsLen, startRow * Math.max(1, cols));
        const endIndex = Math.min(itemsLen, (endRow + 1) * Math.max(1, cols));
        return { startIndex, endIndex };
    }, [scrollTop, overscan.top, overscan.bottom, containerHeight, viewportH, padding, strideY, cols, itemsLen]);

    return { scrollTop, visibleRange } as const;
}