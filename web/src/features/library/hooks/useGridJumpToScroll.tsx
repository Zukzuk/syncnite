import * as React from "react";

type UseParams = {
    containerRef: React.RefObject<HTMLDivElement | null>;
    positions: Array<{ left: number; top: number }>;
};

type UseReturn = {
    scrollItemIntoView: (index: number) => void;
};

// A hook to manage scrolling to grid items within a container.
export function useGridJumpToScroll({ containerRef, positions }: UseParams): UseReturn {
    const scrollItemIntoView = React.useCallback((index: number) => {
        const el = containerRef.current;
        if (!el) return;

        const top = positions[index]?.top ?? 0;
        const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
        const target = Math.max(0, Math.min(top, maxTop));

        el.scrollTo({ top: target, behavior: "auto" });
    }, [containerRef, positions]);

    return { scrollItemIntoView };
}
