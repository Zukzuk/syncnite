import * as React from "react";
import type { Letter } from "../../../lib/types";
import { LETTERS } from "../../../lib/constants";
import { orderedLetters } from "../../../lib/utils";
import type { AlphabeticalRailCounts } from "../../../components/AlphabeticalRail";
import { AlphabeticalGroup } from "./useAlphabetGroups";
import { Item } from "./useLibraryData";

type UseParams = {
    isGrouped: boolean;
    groups: AlphabeticalGroup[] | null;
    flatItems: Item[];
    // from useGridJumpToScroll
    scrollItemIntoView: (index: number) => void;
    // from useVirtualWindow
    visibleStartIndex: number;
    totalItems: number;
};

type UseReturn = {
    counts: AlphabeticalRailCounts;
    activeLetter: string | null;
    handleJump: (L: string) => void;
};

// A hook to manage alphabetical rail navigation for the absolute grid.
export function useAlphabetRail({
    isGrouped,
    groups,
    flatItems,
    scrollItemIntoView,
    visibleStartIndex,
    totalItems,
}: UseParams): UseReturn {
    // flat
    const { flatFirstIndex, flatCounts } = React.useMemo(() => {
        const firstIndex = Object.fromEntries(
            LETTERS.map((L) => [L, -1])
        ) as Record<Letter, number>;

        const counts = Object.fromEntries(
            LETTERS.map((L) => [L, 0])
        ) as AlphabeticalRailCounts;

        flatItems.forEach((r, idx) => {
            const L = orderedLetters(r?.title);
            counts[L] = (counts[L] ?? 0) + 1;
            if (firstIndex[L] === -1) firstIndex[L] = idx;
        });

        return { flatFirstIndex: firstIndex, flatCounts: counts };
    }, [flatItems]);

    // grouped
    const { groupFirstItemIndex, groupCounts } = React.useMemo(() => {
        if (!groups) {
            return {
                groupFirstItemIndex: {} as Record<Letter, number>,
                groupCounts: Object.fromEntries(
                    LETTERS.map((L) => [L, 0])
                ) as AlphabeticalRailCounts,
            };
        }

        const firstIndex = Object.fromEntries(
            LETTERS.map((L) => [L, -1])
        ) as Record<Letter, number>;

        const counts = Object.fromEntries(
            LETTERS.map((L) => [L, 0])
        ) as AlphabeticalRailCounts;

        let running = 0;
        for (const g of groups) {
            const L = orderedLetters(g.title);
            if (firstIndex[L] === -1) firstIndex[L] = running;
            counts[L] = (counts[L] ?? 0) + g.items.length;
            running += g.items.length;
        }

        return { groupFirstItemIndex: firstIndex, groupCounts: counts };
    }, [groups]);

    const [activeLetter, setActiveLetter] = React.useState<string | null>(null);

    const currentLetterAtIndex = React.useCallback(
        (idx: number): string | null => {
            if (idx == null || idx < 0 || idx >= totalItems) return null;

            if (isGrouped && groups && groups.length) {
                let i = idx;
                for (const g of groups) {
                    if (i < g.items.length) return orderedLetters(g.title);
                    i -= g.items.length;
                }
                return null;
            }

            const r = flatItems[idx];
            return r ? orderedLetters(r.title) : null;
        },
        [isGrouped, groups, flatItems, totalItems]
    );

    const handleJump = React.useCallback(
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
    React.useEffect(() => {
        const L = currentLetterAtIndex(visibleStartIndex);
        if (L) setActiveLetter(L);
    }, [visibleStartIndex, currentLetterAtIndex]);

    // Reset when dataset semantics change
    React.useEffect(() => {
        setActiveLetter(null);
    }, [isGrouped, groups?.length, flatItems.length, totalItems]);

    const counts: AlphabeticalRailCounts = isGrouped ? groupCounts : flatCounts;

    return { counts, activeLetter, handleJump };
}
