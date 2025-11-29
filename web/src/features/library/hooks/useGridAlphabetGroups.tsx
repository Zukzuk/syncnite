import * as React from "react";
import { orderedLetters } from "../../../lib/utils";
import { AlphabeticalGroup, GameItem, ItemGroupedByLetter, SortKey } from "../../../types/types";

type UseParams = {
    sortKey: SortKey;
    itemsGroupedByLetter: ItemGroupedByLetter[] | null;
    itemsSorted: GameItem[] | null;
};

type UseReturn = {
    alphabeticalGroups: AlphabeticalGroup[] | null;
    isGrouped: boolean;
    flatItems: GameItem[];
};

// A hook to group items alphabetically based on their titles.
export function useGridAlphabetGroups({ sortKey, itemsGroupedByLetter, itemsSorted }: UseParams): UseReturn {
    const alphabeticalGroups = React.useMemo<AlphabeticalGroup[] | null>(() => {
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
