import React from "react";

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

    // stacks scroll (optional)
    getStacksScrollTop: (itemId: string) => number | null;
    setStacksScrollTop: (itemId: string, scrollTop: number) => void;
};

const LibraryContext = React.createContext<LibraryCtx | null>(null);

function ensureItem(prev: Record<string, ItemState>, itemId: string): ItemState {
    return (
        prev[itemId] ?? {
            selectedDeckKey: null,
            deckScrollTopByDeckKey: {},
        }
    );
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
    const [byItemId, setByItemId] = React.useState<Record<string, ItemState>>({});
    const byItemIdRef = React.useRef(byItemId);
    React.useEffect(() => {
        byItemIdRef.current = byItemId;
    }, [byItemId]);

    // version tick to force re-renders on updates (selection must update UI)
    const [version, setVersion] = React.useState(0);
    const bump = React.useCallback(() => setVersion((v) => v + 1), []);

    // global "last selected deck" for cross-item selection UX
    const lastSelectedDeckKeyRef = React.useRef<DeckKey | null>(null);

    // global "last scroll per deck key" for cross-item scroll UX
    const lastDeckScrollTopByDeckKeyRef = React.useRef<Record<DeckKey, number>>({});

    // ----- READ APIs (stable identity; read from refs) -----

    const getSelectedDeckKey = React.useCallback((itemId: string) => {
        return byItemIdRef.current[itemId]?.selectedDeckKey ?? null;
    }, []);

    const getLastSelectedDeckKey = React.useCallback(() => {
        return lastSelectedDeckKeyRef.current ?? null;
    }, []);

    const pickDeckKey = React.useCallback((itemId: string, available: DeckKey[]) => {
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

    const getDeckScrollTop = React.useCallback((itemId: string, deckKey: DeckKey) => {
        // 1) per-item scroll
        const perItem = byItemIdRef.current[itemId]?.deckScrollTopByDeckKey?.[deckKey];
        if (typeof perItem === "number") return perItem;

        // 2) global last scroll for this deckKey (cross-item)
        const global = lastDeckScrollTopByDeckKeyRef.current[deckKey];
        return typeof global === "number" ? global : null;
    }, []);

    const getStacksScrollTop = React.useCallback((itemId: string) => {
        const v = byItemIdRef.current[itemId]?.stacksScrollTop;
        return typeof v === "number" ? v : null;
    }, []);

    // ----- WRITE APIs (stable identity; update state + bump) -----

    const setSelectedDeckKey = React.useCallback(
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

    const setDeckScrollTop = React.useCallback(
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

    const setStacksScrollTop = React.useCallback(
        (itemId: string, scrollTop: number) => {
            setByItemId((prev) => {
                const cur = ensureItem(prev, itemId);
                const next = { ...prev, [itemId]: { ...cur, stacksScrollTop: scrollTop } };
                byItemIdRef.current = next; // <-- keep ref in sync
                return next;
            });

            bump();
        },
        [bump]
    );

    const value = React.useMemo<LibraryCtx>(
        () => ({
            version,
            pickDeckKey,
            getSelectedDeckKey,
            getLastSelectedDeckKey,
            setSelectedDeckKey,
            getDeckScrollTop,
            setDeckScrollTop,
            getStacksScrollTop,
            setStacksScrollTop,
        }),
        [
            version,
            pickDeckKey,
            getSelectedDeckKey,
            getLastSelectedDeckKey,
            setSelectedDeckKey,
            getDeckScrollTop,
            setDeckScrollTop,
            getStacksScrollTop,
            setStacksScrollTop,
        ]
    );

    return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibraryContext(): LibraryCtx {
    const ctx = React.useContext(LibraryContext);
    if (!ctx) throw new Error("useLibraryContext must be used within <LibraryProvider>");
    return ctx;
}
