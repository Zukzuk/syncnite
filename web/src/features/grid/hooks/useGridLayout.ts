import { RefObject, useLayoutEffect, useMemo, useState } from "react";
import { InterLinkedGrid } from "../../../types/interlinked";

type UseParams = {
    gridRef: RefObject<HTMLDivElement>;
    grid: InterLinkedGrid;
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
export function useGridLayout({ gridRef, grid, itemsLen }: UseParams): UseReturn {
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

    const { 
        cols, 
        rows, 
        strideY, 
        positions, 
        containerHeight,
    } = useMemo(() => {
        const innerW = Math.max(0, width - grid.gap * 2);
        const strideX = grid.cardWidth + grid.gap;
        const cols = Math.max(1, Math.floor((innerW + grid.gap) / strideX));
        const strideY = grid.cardHeight + grid.gap;
        const positions: { left: number; top: number }[] = new Array(itemsLen);

        for (let i = 0; i < itemsLen; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            positions[i] = { left: grid.gap + col * strideX, top: grid.gap + row * strideY };
        }

        const rows = Math.ceil(itemsLen / cols);
        const containerHeight = rows === 0 
            ? grid.gap * 2 + grid.cardHeight 
            : grid.gap + rows * (grid.cardHeight + grid.gap);

        return { cols, rows, strideY, positions, containerHeight };
    }, [width, itemsLen]);

    return { width, viewportH, cols, rows, strideY, positions, containerHeight } as const;
}