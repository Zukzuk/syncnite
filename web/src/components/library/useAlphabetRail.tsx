import * as React from "react";
import type { VirtuosoHandle } from "react-virtuoso";
import { letterBucket } from "../../lib/utils";
import type { Letter, AlphaGroup, AlphabeticalRailCounts, Row } from "../../lib/types";
import { LETTERS } from "../../lib/types";

export function useAlphabetRail(
    params: {
        isGrouped: boolean;
        groups: AlphaGroup[] | null;
        flatItems: Row[];
    },
    virtuosoRef: React.RefObject<VirtuosoHandle>
) {
    const { isGrouped, groups, flatItems } = params;

    // flat
    const { flatFirstIndex, flatCounts } = React.useMemo(() => {
        const firstIndex: Record<Letter, number> = Object.fromEntries(
            LETTERS.map((L) => [L, -1])
        ) as Record<Letter, number>;
        const counts: AlphabeticalRailCounts = Object.fromEntries(
            LETTERS.map((L) => [L, 0])
        ) as AlphabeticalRailCounts;

        flatItems.forEach((r, idx) => {
            const L = letterBucket(r?.title);
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
                groupCounts: Object.fromEntries(LETTERS.map((L) => [L, 0])) as AlphabeticalRailCounts,
            };
        }

        const firstIndex = Object.fromEntries(LETTERS.map((L) => [L, -1])) as Record<Letter, number>;
        const counts = Object.fromEntries(LETTERS.map((L) => [L, 0])) as AlphabeticalRailCounts;

        let running = 0;
        for (const g of groups) {
            const L = letterBucket(g.title);
            if (firstIndex[L] === -1) firstIndex[L] = running;
            counts[L] = (counts[L] ?? 0) + g.rows.length;
            running += g.rows.length;
        }
        return { groupFirstItemIndex: firstIndex, groupCounts: counts };
    }, [groups]);

    const [activeLetter, setActiveLetter] = React.useState<string | null>(null);

    const handleJump = React.useCallback(
        (L: string) => {
            if (isGrouped) {
                const idx = groupFirstItemIndex[L as Letter];
                if (idx !== undefined && idx >= 0) {
                    virtuosoRef.current?.scrollToIndex({ index: idx, align: "start", behavior: "smooth" });
                    setActiveLetter(L);
                }
                return;
            }
            const idx = flatFirstIndex[L as Letter];
            if (idx !== undefined && idx >= 0) {
                virtuosoRef.current?.scrollToIndex({ index: idx, align: "start", behavior: "smooth" });
                setActiveLetter(L);
            }
        },
        [isGrouped, groupFirstItemIndex, flatFirstIndex, virtuosoRef]
    );

    // what the rail needs (and nothing else)
    const counts: AlphabeticalRailCounts = isGrouped ? groupCounts : flatCounts;

    return { counts, activeLetter, handleJump };
}
