// web/src/pages/LibraryPage.tsx
import React from "react";
import { Stack, Group, Text } from "@mantine/core";
import { PageTitle } from "../components/ui/PageTitle";
import SectionCard from "../components/ui/SectionCard";
import { loadLibrary, type Loaded } from "../lib/data";
import { LibraryView } from "../components/library/LibraryView";

export default function LibraryPage() {
    const [data, setData] = React.useState<Loaded | null>(null);
    const [filtered, setFiltered] = React.useState(0);
    const [total, setTotal] = React.useState(0);

    React.useEffect(() => {
        (async () => setData(await loadLibrary()))();
    }, []);

    return (
        <Stack gap="lg" style={{ height: "100%", minHeight: 0 }}>
            <PageTitle
                title="Library"
                subtitle={total ? `${filtered.toLocaleString()} of ${total.toLocaleString()} shown` : undefined}
            />

            <SectionCard title="Browse">
                {data ? (
                    <div style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
                        <LibraryView
                            data={data}
                            onCountsChange={(f, t) => { setFiltered(f); setTotal(t); }}
                        />
                    </div>
                ) : (
                    <Group><Text c="dimmed">Loading…</Text></Group>
                )}
            </SectionCard>
        </Stack>
    );
}
