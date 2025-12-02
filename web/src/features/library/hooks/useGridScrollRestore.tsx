import { useCallback, useEffect, useRef, useState } from "react";
import { GameItem } from "../../../types/types";

type UseParams = {
    gridRef: React.RefObject<HTMLDivElement | null>;
    openIds: Set<string>;
    items: GameItem[];
    scrollItemIntoView: (index: number) => void;
    toggleOpen: (id: string) => void;
};

type UseReturn = {
    onToggleItem: (id: string, absoluteIndex: number) => void;
};

/**
 * Manages open/close state side-effects for items:
 * - remembers scrollTop when opening
 * - restores scroll on close if user didn't scroll manually
 * - scrolls to opened item once layout has updated
 */
export function useGridScrollRestore({ gridRef, openIds, items, scrollItemIntoView, toggleOpen }: UseParams): UseReturn {
    const preOpenScrollTopRef = useRef<number | null>(null);
    const openItemIdRef = useRef<string | null>(null);
    const userScrolledWhileOpenRef = useRef(false);
    const programmaticScrollRef = useRef(false);
    const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(null);

    // Track user scrolls while an item is open
    useEffect(() => {
        const el = gridRef.current;
        if (!el) return;

        const onScroll = () => {
            if (programmaticScrollRef.current) return;
            if (openItemIdRef.current) {
                userScrolledWhileOpenRef.current = true;
            }
        };

        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [gridRef]);

    const onToggleItem = useCallback(
        (id: string, absoluteIndex: number) => {
            const willOpen = !openIds.has(id);
            const el = gridRef.current;

            if (willOpen) {
                preOpenScrollTopRef.current = el ? el.scrollTop : null;
                openItemIdRef.current = id;
                userScrolledWhileOpenRef.current = false;

                toggleOpen(id);
                setPendingScrollIndex(absoluteIndex);
            } else {
                const shouldRestore =
                    openItemIdRef.current === id &&
                    !userScrolledWhileOpenRef.current &&
                    preOpenScrollTopRef.current != null &&
                    el;

                toggleOpen(id);

                if (shouldRestore && el) {
                    programmaticScrollRef.current = true;
                    el.scrollTo({
                        top: preOpenScrollTopRef.current!,
                        behavior: "auto",
                    });
                    requestAnimationFrame(() => {
                        programmaticScrollRef.current = false;
                    });
                }

                openItemIdRef.current = null;
                preOpenScrollTopRef.current = null;
                userScrolledWhileOpenRef.current = false;
            }
        },
        [openIds, toggleOpen, gridRef]
    );

    // Perform scroll after layout updated for the opened item
    useEffect(() => {
        if (pendingScrollIndex == null) return;

        const idx = pendingScrollIndex;
        const item = items[idx];

        if (!item || !openIds.has(item.id)) {
            setPendingScrollIndex(null);
            return;
        }

        programmaticScrollRef.current = true;
        scrollItemIntoView(idx);
        requestAnimationFrame(() => {
            programmaticScrollRef.current = false;
        });

        setPendingScrollIndex(null);
    }, [pendingScrollIndex, items, openIds, scrollItemIntoView]);

    return { onToggleItem };
}
