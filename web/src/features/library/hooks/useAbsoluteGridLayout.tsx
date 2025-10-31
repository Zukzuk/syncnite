import { useLayoutEffect, useMemo, useState } from "react";

/** Measure container and compute absolute grid positions */
export function useAbsoluteGridLayout(
    containerRef: React.RefObject<HTMLDivElement>,
    { padding, cardWidth, cardHeight, gap, itemsLen }: { padding: number; cardWidth: number; cardHeight: number; gap: number; itemsLen: number }
) {
    const [width, setWidth] = useState(0);
    const [viewportH, setViewportH] = useState(0);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onSize = () => {
            const rect = el.getBoundingClientRect();
            setWidth(Math.max(0, Math.floor(rect.width)));
            setViewportH(Math.max(0, Math.floor(rect.height)));
        };
        const ro = new ResizeObserver(onSize);
        ro.observe(el);
        onSize();
        return () => ro.disconnect();
    }, []);

    const layout = useMemo(() => {
        if (width <= 0) {
            return { cols: 1, rows: 0, strideY: cardHeight + gap, positions: [] as { left: number; top: number }[], containerHeight: padding * 2 + cardHeight };
        }
        const innerW = Math.max(0, width - padding * 2);
        const strideX = cardWidth + gap;
        const cols = Math.max(1, Math.floor((innerW + gap) / strideX));
        const strideY = cardHeight + gap;
        const positions: { left: number; top: number }[] = new Array(itemsLen);
        for (let i = 0; i < itemsLen; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            positions[i] = { left: padding + col * strideX, top: padding + row * strideY };
        }
        const rows = Math.ceil(itemsLen / cols);
        const containerHeight = rows === 0 ? padding * 2 + cardHeight : padding * 2 + rows * (cardHeight + gap) - gap;
        return { cols, rows, strideY, positions, containerHeight };
    }, [width, padding, cardWidth, cardHeight, gap, itemsLen]);

    return { width, viewportH, ...layout } as const;
}