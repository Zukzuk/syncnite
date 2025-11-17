import * as React from "react";
import { orderedLetters } from "../../../lib/utils";
import { Item } from "./useLibrary";
import { WithBucket } from "./useLibraryState";

export type AlphabeticalGroup = { 
    title: string; 
    items: Item[];
};

type UseParams = {
    sortKey: string;
    withBuckets: WithBucket[] | null;
    itemsSorted: Item[] | null;
};

type UseReturn = {
    groups: AlphabeticalGroup[] | null;
    isGrouped: boolean;
    flatItems: Item[];
};

// A hook to group items alphabetically based on their titles.
export function useAlphabetGroups({ sortKey, withBuckets, itemsSorted }: UseParams): UseReturn {
    const groups = React.useMemo<AlphabeticalGroup[] | null>(() => {
        if (sortKey !== "title" || !withBuckets || withBuckets.length === 0) {
            return null;
        }
        const out: AlphabeticalGroup[] = [];
        let current: AlphabeticalGroup | null = null;
        for (const { item, bucket } of withBuckets) {
            const b = (bucket || orderedLetters(item?.title)) as string;
            if (!current || current.title !== b) {
                current = { title: b, items: [] };
                out.push(current);
            }
            current.items.push(item);
        }
        return out;
    }, [sortKey, withBuckets]);

    const isGrouped = !!groups && groups.length > 0;
    const flatItems = itemsSorted ?? [];

    return { groups, isGrouped, flatItems };
}
