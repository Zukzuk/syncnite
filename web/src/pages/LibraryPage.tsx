import React from "react";
import { Stack, Loader, Box } from "@mantine/core";
import { loadLibrary } from "../lib/data";
import type { Loaded } from "../lib/types";
import { LibraryList } from "../components/library/LibraryList";
import { useLiveInstalled } from "../components/library/hooks/useLiveInstalled";

export default function LibraryPage() {
    const [data, setData] = React.useState<Loaded | null>(null);
    const [filtered, setFiltered] = React.useState(0);
    const [total, setTotal] = React.useState(0);
    const live = useLiveInstalled(4000);

    React.useEffect(() => {
        (async () => setData(await loadLibrary()))();
    }, []);

    // When the installed.json changes, re-mark installed flags without
    // reloading the big JSON files.
    React.useEffect(() => {
        if (!data || !live.set) return;
        setData(prev => {
            if (!prev) return prev;
            const rows = prev.rows.map(r => ({ ...r, installed: live.set!.has(r.id.toLowerCase()) }));
            return { ...prev, rows };
        });
    }, [live.updatedAt]); // only when updatedAt changes

    return (
        <Stack gap="lg" style={{ height: "100%", minHeight: 0 }}>
            {data ? (
                <Box style={{ height: "calc(100vh - 70px)", minHeight: 400 }}>
                    <LibraryList
                        data={data}
                        onCountsChange={(f, t) => { setFiltered(f); setTotal(t); }}
                        filteredCount={filtered}
                        totalCount={total}
                    />
                </Box>
            ) : (
                <Loader size="sm" />
            )}
        </Stack>
    );
}
