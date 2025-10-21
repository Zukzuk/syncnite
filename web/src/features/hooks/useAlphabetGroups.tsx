import * as React from "react";
import { orderedLetters } from "../../lib/utils";
import { Row } from "./useLibrary";
import { WithBucket } from "./useLibraryState";

export type AlphabeticalGroup = { 
    title: string; 
    rows: Row[];
};

type UseParams = {
    sortKey: string;
    withBuckets: WithBucket[] | null;
    rowsSorted: Row[] | null;
};

type UseReturn = {
    groups: AlphabeticalGroup[] | null;
    isGrouped: boolean;
    flatItems: Row[];
};

export function useAlphabetGroups({ sortKey, withBuckets, rowsSorted }: UseParams): UseReturn {
    const groups = React.useMemo<AlphabeticalGroup[] | null>(() => {
        if (sortKey !== "title" || !withBuckets || withBuckets.length === 0) {
            return null;
        }
        const out: AlphabeticalGroup[] = [];
        let current: AlphabeticalGroup | null = null;
        for (const { row, bucket } of withBuckets) {
            const b = (bucket || orderedLetters(row?.title)) as string;
            if (!current || current.title !== b) {
                current = { title: b, rows: [] };
                out.push(current);
            }
            current.rows.push(row);
        }
        return out;
    }, [sortKey, withBuckets]);

    const isGrouped = !!groups && groups.length > 0;
    const flatItems = rowsSorted ?? [];

    return { groups, isGrouped, flatItems };
}
