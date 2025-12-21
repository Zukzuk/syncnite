import { useCallback, useEffect, useMemo, useState } from "react";
import { AlphabeticalGroup, GameItem, ItemGroupedByLetter, Letter, SortKey, UIControls, UIDerivedData } from "../../../types/types";
import { orderedLetters } from "../../../utils";
import { LETTERS } from "../../../constants";

// Compute alphabetical groups from grouped items
function calcAlphabetGroups({ sortKey, itemsGroupedByLetter, itemsSorted }: {
    sortKey: SortKey;
    itemsGroupedByLetter: ItemGroupedByLetter[] | null;
    itemsSorted: GameItem[] | null;
}): {
    alphabeticalGroups: AlphabeticalGroup[] | null; isGrouped: boolean; flatItems: GameItem[];
} {
    const alphabeticalGroups = useMemo<AlphabeticalGroup[] | null>(() => {
        if (sortKey !== "title" || !itemsGroupedByLetter || itemsGroupedByLetter.length === 0) {
            return null;
        }

        const out: AlphabeticalGroup[] = [];
        let current: AlphabeticalGroup | null = null;

        for (const { item, itemLetter } of itemsGroupedByLetter) {
            const gp = (itemLetter || orderedLetters(item?.title, item?.sortingName));
            if (!current || current.groupLetter !== gp) {
                current = { groupLetter: gp, items: [] };
                out.push(current);
            }
            current.items.push(item);
        }
        return out;
    }, [sortKey, itemsGroupedByLetter]);

    const isGrouped = !!alphabeticalGroups && alphabeticalGroups.length > 0;
    const flatItems = itemsSorted ?? [];

    return { alphabeticalGroups, isGrouped, flatItems };
}

type UseParams = {
    ui: UIControls;
    derived: UIDerivedData;
    visibleRange: { startIndex: number; endIndex: number };
    scrollItemIntoView: (index: number) => void;
};

type UseReturn = {
    railCounts: Record<Letter, number>;
    activeLetter: Letter;
    onScrollJump: (L: Letter) => void;
};

// Hook to manage alphabet rail state and behavior
export function useAlphabetRail({
    ui,
    derived,
    visibleRange,
    scrollItemIntoView,
}: UseParams): UseReturn {
    const { sortKey } = ui;
    const { itemsGroupedByLetter, itemsSorted } = derived;
    const itemsLen = itemsSorted.length;

    // Visible index for alphabet rail
    const railVisibleIndex =
        visibleRange.endIndex > visibleRange.startIndex
            ? Math.floor(
                (visibleRange.startIndex + visibleRange.endIndex - 1) / 2
            )
            : visibleRange.startIndex;

    // Alphabet groups for rail
    const { alphabeticalGroups, isGrouped, flatItems } = calcAlphabetGroups({
        sortKey,
        itemsGroupedByLetter,
        itemsSorted,
    });

    // flat
    const { flatFirstIndex, flatCounts } = useMemo(() => {
        const firstIndex = Object.fromEntries(
            LETTERS.map((L) => [L, -1])
        );

        const counts = Object.fromEntries(
            LETTERS.map((L) => [L, 0])
        );

        flatItems.forEach((r, idx) => {
            const L = orderedLetters(r?.title, r?.sortingName);
            counts[L] = (counts[L] ?? 0) + 1;
            if (firstIndex[L] === -1) firstIndex[L] = idx;
        });

        return { flatFirstIndex: firstIndex, flatCounts: counts };
    }, [flatItems]);

    // grouped
    const { groupFirstItemIndex, groupCounts } = useMemo(() => {
        if (!alphabeticalGroups) {
            return {
                groupFirstItemIndex: {},
                groupCounts: Object.fromEntries(
                    LETTERS.map((L) => [L, 0])
                ),
            };
        }

        const firstIndex = Object.fromEntries(
            LETTERS.map((L) => [L, -1])
        );

        const counts = Object.fromEntries(
            LETTERS.map((L) => [L, 0])
        );

        let running = 0;
        for (const g of alphabeticalGroups) {
            const L = orderedLetters(g.groupLetter);
            if (firstIndex[L] === -1) firstIndex[L] = running;
            counts[L] = (counts[L] ?? 0) + g.items.length;
            running += g.items.length;
        }

        return { groupFirstItemIndex: firstIndex, groupCounts: counts };
    }, [alphabeticalGroups]);

    // Active letter state
    const [activeLetter, setActiveLetter] = useState<string>("");

    // Determine the letter at a given item index
    const currentLetterAtIndex = useCallback(
        (idx: number): string | null => {
            if (idx == null || idx < 0 || idx >= itemsLen) return null;

            if (isGrouped && alphabeticalGroups && alphabeticalGroups.length) {
                let i = idx;
                for (const g of alphabeticalGroups) {
                    if (i < g.items.length) return orderedLetters(g.groupLetter);
                    i -= g.items.length;
                }
                return null;
            }

            const item = flatItems[idx];
            return item ? orderedLetters(item.title, item.sortingName) : null;
        },
        [isGrouped, alphabeticalGroups, flatItems, itemsLen]
    );

    // Scroll jump handler
    const onScrollJump = useCallback(
        (L: string) => {
            const targetIdx = isGrouped
                ? groupFirstItemIndex[L as Letter]
                : flatFirstIndex[L as Letter];

            if (targetIdx == null || targetIdx < 0) return;

            // Let the grid’s jump hook do the scrolling
            scrollItemIntoView(targetIdx);
        },
        [isGrouped, groupFirstItemIndex, flatFirstIndex, scrollItemIntoView]
    );

    // Follow scroll: top visible item determines active letter
    useEffect(() => {
        const L = currentLetterAtIndex(railVisibleIndex);
        if (L) setActiveLetter(L);
    }, [railVisibleIndex, currentLetterAtIndex]);

    // Reset when dataset semantics change
    useEffect(() => {
        setActiveLetter("");
    }, [isGrouped, alphabeticalGroups?.length, flatItems.length, itemsLen]);

    // Choose counts based on grouping
    const railCounts = isGrouped ? groupCounts : flatCounts;

    return { railCounts, activeLetter, onScrollJump };
}