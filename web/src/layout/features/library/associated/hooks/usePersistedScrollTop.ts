import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

type UseParams = {
    key: string;
    get: () => number | null;
    set: (top: number) => void;
};

type UseReturn = {
    scrollRef: React.RefObject<HTMLDivElement>;
    onScroll: () => void;
};

export function usePersistedScrollTop({ key, get, set }: UseParams): UseReturn {
    const scrollRef = useRef<HTMLDivElement>(null!); // <-- IMPORTANT: no | null
    const rafRef = useRef<number | null>(null);

    useLayoutEffect(() => {
        const el = scrollRef.current;
        const saved = get();
        el.scrollTop = typeof saved === "number" ? saved : 0;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const onScroll = useCallback(() => {
        const el = scrollRef.current;
        if (rafRef.current != null) return;

        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            set(el.scrollTop);
        });
    }, [set]);

    useEffect(() => {
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return { scrollRef, onScroll };
}
