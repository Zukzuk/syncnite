import * as React from "react";
import { letterBucket } from "../../lib/utils";
import { AlphaGroup, Row, WithBucket } from "../../lib/types";

export function useAlphabetGroups(
    sortKey: string | undefined,
    withBuckets: WithBucket[] | undefined,
    rowsSorted: Row[] | undefined
) {
    const groups = React.useMemo<AlphaGroup[] | null>(() => {
        if (sortKey !== "title" || !withBuckets || withBuckets.length === 0) {
            return null;
        }
        const out: AlphaGroup[] = [];
        let current: AlphaGroup | null = null;
        for (const { row, bucket } of withBuckets) {
            const b = (bucket || letterBucket(row?.title)) as string;
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
