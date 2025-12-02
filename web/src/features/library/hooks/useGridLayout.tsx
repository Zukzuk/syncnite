import { useLayoutEffect, useMemo, useState } from "react";
import { GRID } from "../../../lib/constants";

type UseParams = {
    gridRef: React.RefObject<HTMLDivElement>;
    itemsLen: number;
};

type UseReturn = {
    width: number;
    viewportH: number;
    cols: number;
    rows: number;
    strideY: number;
    positions: { left: number; top: number }[];
    containerHeight: number;
};

// A hook to calculate an absolute grid layout for a container.
export function useGridLayout({ gridRef, itemsLen }: UseParams): UseReturn {
    const [width, setWidth] = useState(0);
    const [viewportH, setViewportH] = useState(0);

    useLayoutEffect(() => {
        const el = gridRef.current;
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
        const innerW = Math.max(0, width - GRID.gap * 2);
        const strideX = GRID.cardWidth + GRID.gap;
        const cols = Math.max(1, Math.floor((innerW + GRID.gap) / strideX));
        const strideY = GRID.cardHeight + GRID.gap;
        const positions: { left: number; top: number }[] = new Array(itemsLen);
        for (let i = 0; i < itemsLen; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            positions[i] = { left: GRID.gap + col * strideX, top: GRID.gap + row * strideY };
        }
        const rows = Math.ceil(itemsLen / cols);
        const containerHeight = rows === 0 ? GRID.gap * 2 + GRID.cardHeight : GRID.gap * 2 + rows * (GRID.cardHeight + GRID.gap) - GRID.gap;
        return { cols, rows, strideY, positions, containerHeight };
    }, [width, itemsLen]);

    return { width, viewportH, ...layout } as const;
}