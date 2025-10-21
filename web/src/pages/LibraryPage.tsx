import React from "react";
import { Stack, Loader, Box, Center, Group, SegmentedControl } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { GRID } from "../lib/constants";
import { useLibrary } from "../components/hooks/useLibrary";
import { LibraryList } from "../components/library/LibraryList";
import LibraryGrid from "../components/library/LibraryGrid";

type ViewMode = "list" | "grid";

export default function LibraryPage() {
    const [filtered, setFiltered] = React.useState(0);
    const [total, setTotal] = React.useState(0);
    const { data, installedUpdatedAt } = useLibrary({ pollMs: 4000 });

    // Persist the view choice; defaults to 'list' to keep current behavior
    const [view, setView] = useLocalStorage<ViewMode>({
        key: "library.view",
        defaultValue: "list",
    });

    return (
        <Stack gap="lg" style={{ height: "100%", minHeight: 0 }}>
            {data ? (
                <>
                    {/* Small right-aligned toggle; doesn't affect loader or sizing */}
                    <Group justify="flex-end" px="xs">
                        <SegmentedControl
                            value={view}
                            onChange={(v) => setView(v as ViewMode)}
                            data={[
                                { value: "list", label: "List" },
                                { value: "grid", label: "Grid" },
                            ]}
                        />
                    </Group>

                    <Box style={{ height: `calc(100vh - ${GRID.rowHeight}px)` }}>
                        {view === "grid" ? (
                            <LibraryGrid
                                rows={data.rows}
                                installedUpdatedAt={installedUpdatedAt ?? null}
                            />
                        ) : (
                            <LibraryList
                                data={data}
                                onCountsChange={(f, t) => {
                                    setFiltered(f);
                                    setTotal(t);
                                }}
                                filteredCount={filtered}
                                totalCount={total}
                                installedUpdatedAt={installedUpdatedAt || ""}
                            />
                        )}
                    </Box>
                </>
            ) : (
                <Center w={`calc(100vw - ${GRID.menuWidth}px)`} h={`calc(100vh - ${GRID.rowHeight}px)`}>
                    <Loader size="lg" />
                </Center>
            )}
        </Stack>
    );
}
