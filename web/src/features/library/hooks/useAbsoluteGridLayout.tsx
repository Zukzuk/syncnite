import { useLayoutEffect, useMemo, useState } from "react";
import { GRID } from "../../../lib/constants";

// A hook to calculate an absolute grid layout for a container.
export function useAbsoluteGridLayout(
    containerRef: React.RefObject<HTMLDivElement>,
    itemsLen: number,
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
        const innerW = Math.max(0, width - GRID.padding * 2);
        const strideX = GRID.cardWidth + GRID.gap;
        const cols = Math.max(1, Math.floor((innerW + GRID.gap) / strideX));
        const strideY = GRID.cardHeight + GRID.gap;
        const positions: { left: number; top: number }[] = new Array(itemsLen);
        for (let i = 0; i < itemsLen; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            positions[i] = { left: GRID.padding + col * strideX, top: GRID.padding + row * strideY };
        }
        const rows = Math.ceil(itemsLen / cols);
        const containerHeight = rows === 0 ? GRID.padding * 2 + GRID.cardHeight : GRID.padding * 2 + rows * (GRID.cardHeight + GRID.gap) - GRID.gap;
        return { cols, rows, strideY, positions, containerHeight };
    }, [width, itemsLen]);

    return { width, viewportH, ...layout } as const;
}