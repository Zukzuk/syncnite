import React from "react";
import { Stack, Group, Text } from "@mantine/core";
import { loadLibrary } from "../lib/data";
import type { Loaded } from "../lib/types";
import { LibraryList } from "../components/library/LibraryList";

export default function LibraryPage() {
    const [data, setData] = React.useState<Loaded | null>(null);
    const [filtered, setFiltered] = React.useState(0);
    const [total, setTotal] = React.useState(0);

    React.useEffect(() => {
        (async () => setData(await loadLibrary()))();
    }, []);

    return (
        <Stack gap="lg" style={{ height: "100%", minHeight: 0 }}>
            {data ? (
                <div style={{ height: "calc(100vh - 90px)", minHeight: 400 }}>
                    <LibraryList
                        data={data}
                        onCountsChange={(f, t) => { setFiltered(f); setTotal(t); }}
                        filteredCount={filtered}
                        totalCount={total}
                    />
                </div>
            ) : (
                <Group><Text className="is-dim">Loading…</Text></Group>
            )}
        </Stack>
    );
}
