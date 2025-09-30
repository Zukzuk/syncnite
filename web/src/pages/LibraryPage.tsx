import React from "react";
import { Stack, Loader, Box } from "@mantine/core";
import { loadLibrary } from "../lib/data";
import type { Loaded } from "../lib/types";
import { LibraryList } from "../components/library/LibraryList";
import { useLocalInstalled } from "../components/library/hooks/useLocalInstalled";

export default function LibraryPage() {
    const [data, setData] = React.useState<Loaded | null>(null);
    const [filtered, setFiltered] = React.useState(0);
    const [total, setTotal] = React.useState(0);
    const localInstalled = useLocalInstalled(4000);

    React.useEffect(() => {
        (async () => setData(await loadLibrary()))();
    }, []);

    // When the *.Installed.json changes, re-mark installed flags without reloading the big JSON files.
    React.useEffect(() => {
        if (!data || !localInstalled.set) return;
        setData(prev => {
            if (!prev) return prev;
            const rows = prev.rows.map(r => ({ ...r, installed: localInstalled.set!.has(r.id.toLowerCase()) }));
            return { ...prev, rows };
        });
    }, [localInstalled.updatedAt]);

    // When we get a "library changed" event, reload everything.
    React.useEffect(() => {
        const onLibraryChanged = async () => {
            setData(await loadLibrary());     // cache-busted loads already
        };
        window.addEventListener("pn:library-changed", onLibraryChanged);
        return () => window.removeEventListener("pn:library-changed", onLibraryChanged);
    }, []);

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
