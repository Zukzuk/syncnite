import * as React from "react";
import type { VirtuosoHandle } from "react-virtuoso";
import type { Letter } from "../../../lib/types";
import { LETTERS } from "../../../lib/constants";
import { orderedLetters } from "../../../lib/utils";
import type { AlphabeticalRailCounts } from "../../../components/AlphabeticalRail";
import { AlphabeticalGroup } from "./useAlphabetGroups";
import { Item } from "./useLibrary";

type Range = { 
    startIndex: number; 
    endIndex: number 
};

type UseParams = {
    isGrouped: boolean;
    groups: AlphabeticalGroup[] | null;
    flatItems: Item[];
    virtuosoRef: React.RefObject<VirtuosoHandle>;
};

type UseReturn = { 
    counts: AlphabeticalRailCounts, 
    activeLetter: string | null, 
    handleJump: (L: string) => void, 
    rangeChanged: (range: Range) => void,
}

// A hook to manage alphabetical rail navigation for a list.
export function useAlphabetRail({isGrouped, groups, flatItems, virtuosoRef }: UseParams): UseReturn {

    // flat
    const { flatFirstIndex, flatCounts } = React.useMemo(() => {
        const firstIndex = Object.fromEntries(LETTERS.map((L) => [L, -1])) as Record<Letter, number>;
        const counts = Object.fromEntries(LETTERS.map((L) => [L, 0])) as AlphabeticalRailCounts;

        flatItems.forEach((r, idx) => {
            const L = orderedLetters(r?.title);
            counts[L] = (counts[L] ?? 0) + 1;
            if (firstIndex[L] === -1) firstIndex[L] = idx;
        });

        return { flatFirstIndex: firstIndex, flatCounts: counts };
    }, [flatItems]);

    // group
    const { groupFirstItemIndex, groupCounts, totalItems } = React.useMemo(() => {
        if (!groups) {
            return {
                groupFirstItemIndex: {} as Record<Letter, number>,
                groupCounts: Object.fromEntries(LETTERS.map((L) => [L, 0])) as AlphabeticalRailCounts,
                totalItems: 0,
            };
        }

        const firstIndex = Object.fromEntries(LETTERS.map((L) => [L, -1])) as Record<Letter, number>;
        const counts = Object.fromEntries(LETTERS.map((L) => [L, 0])) as AlphabeticalRailCounts;

        let running = 0;
        for (const g of groups) {
            const L = orderedLetters(g.title);
            if (firstIndex[L] === -1) firstIndex[L] = running;
            counts[L] = (counts[L] ?? 0) + g.items.length;
            running += g.items.length;
        }
        return { groupFirstItemIndex: firstIndex, groupCounts: counts, totalItems: running };
    }, [groups]);

    const [activeLetter, setActiveLetter] = React.useState<string | null>(null);
    const lastRangeRef = React.useRef<Range | null>(null);

    // If the letter's first item can be placed at the top, go there.
    // Otherwise, go straight to the *end* of the list.
    const handleJump = React.useCallback(
        (L: string) => {
            const targetIdx = isGrouped
                ? groupFirstItemIndex[L as Letter]
                : flatFirstIndex[L as Letter];
            if (targetIdx == null || targetIdx < 0) return;

            const total = isGrouped ? totalItems : flatItems.length;
            const lastRange = lastRangeRef.current;

            // If we don't yet know viewport size, try aligning to the target "start".
            // If it ends up clamped by Virtuoso, next rangeChanged will give us viewport,
            // and subsequent clicks will follow goto end.
            if (!lastRange) {
                virtuosoRef.current?.scrollToIndex({ index: targetIdx, align: "start", behavior: "auto" });
                return;
            }

            const visibleCount = Math.max(1, lastRange.endIndex - lastRange.startIndex + 1);
            const highStart = Math.max(0, total - visibleCount); // last possible start index
            const canPlaceAtTop = targetIdx <= highStart;

            if (canPlaceAtTop) {
                // Already at desired start? no-op
                if (lastRange.startIndex !== targetIdx) {
                    virtuosoRef.current?.scrollToIndex({ index: targetIdx, align: "start", behavior: "auto" });
                }
            } else {
                // Can't place at top -> scroll to end of list
                const endIndex = total > 0 ? total - 1 : 0;
                if (lastRange.endIndex !== endIndex) {
                    virtuosoRef.current?.scrollToIndex({ index: endIndex, align: "end", behavior: "auto" });
                }
            }
        },
        [isGrouped, groupFirstItemIndex, flatFirstIndex, totalItems, flatItems.length, virtuosoRef]
    );

    // Determine the letter at a global item index
    const currentLetterAtIndex = React.useCallback(
        (idx: number): string | null => {
            if (idx == null || idx < 0) return null;

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
        [isGrouped, groups, flatItems]
    );

    // Follow the scroll (top-of-view determines active)
    const rangeChanged = React.useCallback(
        (range: Range) => {
            lastRangeRef.current = range;
            const L = currentLetterAtIndex(range.startIndex);
            if (L) setActiveLetter(L);
        },
        [currentLetterAtIndex]
    );

    // Reset when dataset semantics change
    React.useEffect(() => {
        setActiveLetter(null);
        lastRangeRef.current = null;
    }, [isGrouped, groups?.length, flatItems.length, totalItems]);

    const counts: AlphabeticalRailCounts = isGrouped ? groupCounts : flatCounts;

    return { counts, activeLetter, handleJump, rangeChanged };
}
