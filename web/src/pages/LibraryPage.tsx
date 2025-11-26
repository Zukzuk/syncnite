import React from "react";
import { Stack, Loader, Box, Center } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { GRID, INTERVAL_MS } from "../lib/constants";
import { ViewMode } from "../lib/types";
import { useLibraryData } from "../features/library/hooks/useLibraryData";
import LibraryGrid from "../features/library/LibraryGrid";

export default function LibraryPage() {
    const [filtered, setFiltered] = React.useState(0);
    const [total, setTotal] = React.useState(0);
    const { data, installedUpdatedAt } = useLibraryData({ pollMs: INTERVAL_MS });

    const [view, setView] = useLocalStorage<ViewMode>({
        key: "library.view",
        defaultValue: "grid",
    });

    if (!data) {
        return (
            <Stack gap="lg" style={{ height: "100%", minHeight: 0 }}>
                <Center w={`calc(100vw - ${GRID.menuWidth}px)`} h={`calc(100vh - ${GRID.rowHeight}px)`}>
                    <Loader size="lg" />
                </Center>
            </Stack>
        );
    }

    return (
        <Stack gap="lg" style={{ height: "100%", minHeight: 0 }}>
            <Box style={{ height: `calc(100vh - ${GRID.rowHeight}px)` }}>
                <LibraryGrid
                    data={data}
                    onCountsChange={(f, t) => {
                        setFiltered(f);
                        setTotal(t);
                    }}
                    view={view}
                    setView={setView}
                    filteredCount={filtered}
                    totalCount={total}
                    installedUpdatedAt={installedUpdatedAt || ""}
                />
            </Box>
        </Stack>
    );
}
