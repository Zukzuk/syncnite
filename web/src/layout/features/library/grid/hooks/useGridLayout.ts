import { RefObject, useLayoutEffect, useMemo, useState } from "react";
import { InterLinkedGrid } from "../../../../../types/interlinked";

type UseParams = {
    gridRef: RefObject<HTMLDivElement>;
    dynamicGrid: InterLinkedGrid;
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
export function useGridLayout({ gridRef, dynamicGrid, itemsLen }: UseParams): UseReturn {
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
        if (!dynamicGrid.cardWidth || !dynamicGrid.cardHeight) {
            return {
                cols: 1,
                rows: 0,
                strideY: 0,
                positions: [],
                containerHeight: 0,
            };
        }

        const innerW = Math.max(0, width - dynamicGrid.gap * 2);
        const strideX = dynamicGrid.cardWidth + dynamicGrid.gap;
        const cols = Math.max(1, Math.floor((innerW + dynamicGrid.gap) / strideX));
        const strideY = dynamicGrid.cardHeight + dynamicGrid.gap;
        const positions: { left: number; top: number }[] = new Array(itemsLen);

        for (let i = 0; i < itemsLen; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            positions[i] = { left: dynamicGrid.gap + col * strideX, top: dynamicGrid.gap + row * strideY };
        }

        const rows = Math.ceil(itemsLen / cols);
        const containerHeight = rows === 0 
            ? dynamicGrid.gap * 2 + dynamicGrid.cardHeight 
            : dynamicGrid.gap + rows * (dynamicGrid.cardHeight + dynamicGrid.gap);

        return { cols, rows, strideY, positions, containerHeight };
    }, [width, itemsLen, dynamicGrid]);

    return { width, viewportH, cols, rows, strideY, positions, containerHeight } as const;
}