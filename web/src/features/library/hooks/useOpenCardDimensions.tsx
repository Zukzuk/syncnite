import { useLayoutEffect, useMemo, useState } from "react";
import { GRID } from "../../../lib/constants";

type UseParams = {
    topOffset: number;
};

type UseReturn = {
    openWidth: string;
    openHeight: string;
    dynamicOpenHeight: number;
};

/**
 * Derives open card CSS dimensions and numeric height based on viewport and header/controls offset.
 */
export function useOpenCardDimensions({ topOffset }: UseParams): UseReturn {
    const [windowInnerH, setWindowInnerH] = useState<number>(
        typeof window !== "undefined" ? window.innerHeight : 0
    );

    useLayoutEffect(() => {
        if (typeof window === "undefined") return;

        const onResize = () => setWindowInnerH(window.innerHeight);
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const dynamicOpenHeight = useMemo(() => {
        if (windowInnerH <= 0) return GRID.cardHeight;
        const h = windowInnerH - topOffset - GRID.iconSize - 12;
        return Math.max(GRID.cardHeight, h);
    }, [windowInnerH, topOffset]);

    const openWidth = `calc(100vw - ${GRID.menuWidth}px - 15px)`;
    const openHeight = `calc(100vh - ${topOffset}px - ${GRID.iconSize}px - 12px)`;

    return { openWidth, openHeight, dynamicOpenHeight } as const;
}
