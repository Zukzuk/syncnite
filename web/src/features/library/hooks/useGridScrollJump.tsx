import * as React from "react";

type UseParams = {
    gridRef: React.RefObject<HTMLDivElement | null>;
    positions: Array<{ left: number; top: number }>;
};

type UseReturn = {
    scrollItemIntoView: (index: number) => void;
};

// A hook to manage scrolling to grid items within a container.
export function useGridScrollJump({ gridRef, positions }: UseParams): UseReturn {
    const scrollItemIntoView = React.useCallback((index: number) => {
        const el = gridRef.current;
        if (!el) return;

        const top = positions[index]?.top ?? 0;
        const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
        const target = Math.max(0, Math.min(top, maxTop));

        el.scrollTo({ top: target, behavior: "auto" });
    }, [gridRef, positions]);

    return { scrollItemIntoView };
}
