import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type DeckKey = string;

type ItemState = {
    selectedDeckKey: DeckKey | null;
    deckScrollTopByDeckKey: Record<DeckKey, number>;
    stacksScrollTop?: number;
};

export type LibraryCtx = {
    /** bump when anything meaningful changes so consumers re-render */
    version: number;

    // selection
    pickDeckKey: (itemId: string, availableDeckKeys: DeckKey[]) => DeckKey | null;
    getSelectedDeckKey: (itemId: string) => DeckKey | null;
    getLastSelectedDeckKey: () => DeckKey | null;
    setSelectedDeckKey: (itemId: string, deckKey: DeckKey | null) => void;

    // deck scroll
    getDeckScrollTop: (itemId: string, deckKey: DeckKey) => number | null;
    setDeckScrollTop: (itemId: string, deckKey: DeckKey, scrollTop: number) => void;
};

const LibraryContext = createContext<LibraryCtx | null>(null);

function ensureItem(prev: Record<string, ItemState>, itemId: string): ItemState {
    return (
        prev[itemId] ?? {
            selectedDeckKey: null,
            deckScrollTopByDeckKey: {},
        }
    );
}

export function LibraryProvider({ children }: { children: ReactNode }) {
    const [byItemId, setByItemId] = useState<Record<string, ItemState>>({});
    const byItemIdRef = useRef(byItemId);
    useEffect(() => {
        byItemIdRef.current = byItemId;
    }, [byItemId]);

    // version tick to force re-renders on updates (selection must update UI)
    const [version, setVersion] = useState(0);
    const bump = useCallback(() => setVersion((v) => v + 1), []);

    // global "last selected deck" for cross-item selection UX
    const lastSelectedDeckKeyRef = useRef<DeckKey | null>(null);
    // global "last scroll per deck key" for cross-item scroll UX
    const lastDeckScrollTopByDeckKeyRef = useRef<Record<DeckKey, number>>({});

    const getSelectedDeckKey = useCallback((itemId: string) => {
        return byItemIdRef.current[itemId]?.selectedDeckKey ?? null;
    }, []);

    const getLastSelectedDeckKey = useCallback(() => {
        return lastSelectedDeckKeyRef.current ?? null;
    }, []);

    const pickDeckKey = useCallback((itemId: string, available: DeckKey[]) => {
        if (!available.length) return null;

        // 1) per-item remembered selection
        const perItem = byItemIdRef.current[itemId]?.selectedDeckKey;
        if (perItem && available.includes(perItem)) return perItem;

        // 2) last selection across items
        const last = lastSelectedDeckKeyRef.current;
        if (last && available.includes(last)) return last;

        // 3) fallback
        return available[0];
    }, []);

    const getDeckScrollTop = useCallback((itemId: string, deckKey: DeckKey) => {
        // per-item scroll
        const perItem = byItemIdRef.current[itemId]?.deckScrollTopByDeckKey?.[deckKey];
        if (typeof perItem === "number") return perItem;

        // global last scroll for this deckKey (cross-item)
        const global = lastDeckScrollTopByDeckKeyRef.current[deckKey];
        return typeof global === "number" ? global : null;
    }, []);

    const setSelectedDeckKey = useCallback(
        (itemId: string, deckKey: DeckKey | null) => {
            lastSelectedDeckKeyRef.current = deckKey;

            setByItemId((prev) => {
                const cur = ensureItem(prev, itemId);
                const next = { ...prev, [itemId]: { ...cur, selectedDeckKey: deckKey } };
                byItemIdRef.current = next; // <-- IMPORTANT: keep ref in sync immediately
                return next;
            });

            bump();
        },
        [bump]
    );

    const setDeckScrollTop = useCallback(
        (itemId: string, deckKey: DeckKey, scrollTop: number) => {
            lastDeckScrollTopByDeckKeyRef.current = {
                ...lastDeckScrollTopByDeckKeyRef.current,
                [deckKey]: scrollTop,
            };

            setByItemId((prev) => {
                const cur = ensureItem(prev, itemId);
                const next = {
                    ...prev,
                    [itemId]: {
                        ...cur,
                        deckScrollTopByDeckKey: {
                            ...cur.deckScrollTopByDeckKey,
                            [deckKey]: scrollTop,
                        },
                    },
                };
                byItemIdRef.current = next; // <-- keep ref in sync
                return next;
            });

            bump();
        },
        [bump]
    );

    const value = useMemo<LibraryCtx>(
        () => ({
            version,
            pickDeckKey,
            getSelectedDeckKey,
            getLastSelectedDeckKey,
            setSelectedDeckKey,
            getDeckScrollTop,
            setDeckScrollTop,
        }),
        [
            version,
            pickDeckKey,
            getSelectedDeckKey,
            getLastSelectedDeckKey,
            setSelectedDeckKey,
            getDeckScrollTop,
            setDeckScrollTop,
        ]
    );

    return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibraryContext(): LibraryCtx {
    const ctx = useContext(LibraryContext);
    if (!ctx) throw new Error("useLibraryContext must be used within <LibraryProvider>");
    return ctx;
}
