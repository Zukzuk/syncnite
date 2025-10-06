import React from "react";
import { Stack, Loader, Box, Center } from "@mantine/core";
import { loadLibrary } from "../lib/data";
import type { Loaded } from "../lib/types";
import { GRID } from "../lib/constants";
import { LibraryList } from "../components/library/LibraryList";
import { useLocalInstalled } from "../components/hooks/useLocalInstalled";
import { useRefreshLibrary } from "../components/hooks/useRefreshLibrary";

export default function LibraryPage() {
    const [data, setData] = React.useState<Loaded | null>(null);
    const [filtered, setFiltered] = React.useState(0);
    const [total, setTotal] = React.useState(0);

    // poll filesystem
    const { version: libraryVersion } = useRefreshLibrary(4000);
    const { set: installedSet, updatedAt: installedUpdatedAt } = useLocalInstalled(4000);

    // Initial load + reload whenever the library manifest changes
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            const fresh = await loadLibrary();
            if (!cancelled) setData(fresh);
        })();
        return () => { cancelled = true; };
    }, [libraryVersion]);

    // When installed changes, patch flags in-place (fast, no full reload)
    React.useEffect(() => {
        if (!installedSet || !installedUpdatedAt) return;
        setData(prev => {
            if (!prev) return prev;
            const rows = prev.rows.map(r => ({
                ...r,
                installed: installedSet.has(r.id.toLowerCase()),
            }));
            return { ...prev, rows };
        });
    }, [installedUpdatedAt, installedSet]);

    return (
        <Stack gap="lg" style={{ height: "100%", minHeight: 0 }}>
            {data ? (
                <Box style={{ height: `calc(100vh - ${GRID.rowHeight}px)` }}>
                    <LibraryList
                        data={data}
                        onCountsChange={(f, t) => { setFiltered(f); setTotal(t); }}
                        filteredCount={filtered}
                        totalCount={total}
                        installedUpdatedAt={installedUpdatedAt || ""}
                    />
                </Box>
            ) : (
                <Center w={`calc(100vw - ${GRID.menuWidth}px)`} h={`calc(100vh - ${GRID.rowHeight}px)`}>
                    <Loader size="lg" />
                </Center>
            )}
        </Stack>
    );
}
