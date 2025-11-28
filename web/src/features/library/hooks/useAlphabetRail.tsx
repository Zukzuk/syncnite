import * as React from "react";
import type { AlphabeticalGroup, GameItem, Letter } from "../../../types/types";
import { LETTERS } from "../../../lib/constants";
import { orderedLetters } from "../../../lib/utils";

type UseParams = {
    isGrouped: boolean;
    alphabeticalGroups: AlphabeticalGroup[] | null;
    flatItems: GameItem[];
    scrollItemIntoView: (index: number) => void;
    visibleStartIndex: number;
    totalItems: number;
};

type UseReturn = {
    railCounts: Record<Letter, number>;
    activeLetter: Letter;
    handleJump: (L: Letter) => void;
};

// A hook to manage alphabetical rail navigation for the absolute grid.
export function useAlphabetRail({ isGrouped, alphabeticalGroups, flatItems, scrollItemIntoView, visibleStartIndex, totalItems }: UseParams): UseReturn {
    // flat
    const { flatFirstIndex, flatCounts } = React.useMemo(() => {
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
    const { groupFirstItemIndex, groupCounts } = React.useMemo(() => {
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

    const [activeLetter, setActiveLetter] = React.useState<string>("");

    const currentLetterAtIndex = React.useCallback(
        (idx: number): string | null => {
            if (idx == null || idx < 0 || idx >= totalItems) return null;
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
        [isGrouped, alphabeticalGroups, flatItems, totalItems]
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
        setActiveLetter("");
    }, [isGrouped, alphabeticalGroups?.length, flatItems.length, totalItems]);

    const railCounts = isGrouped ? groupCounts : flatCounts;

    return { railCounts, activeLetter, handleJump };
}
