import React from "react";
import { Stack, Loader, Box, Center } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { GRID } from "../lib/constants";
import { ViewMode } from "../lib/types";
import { useLibrary } from "../features/hooks/useLibrary";
import LibraryList from "../features/library/LibraryList";
import LibraryGrid from "../features/library/LibraryGrid";

export default function LibraryPage() {
    const [filtered, setFiltered] = React.useState(0);
    const [total, setTotal] = React.useState(0);
    const { data, installedUpdatedAt } = useLibrary({ pollMs: 4000 });

    const [view, setView] = useLocalStorage<ViewMode>({
        key: "library.view",
        defaultValue: "list",
    });

    return (
        <Stack gap="lg" style={{ height: "100%", minHeight: 0 }}>
            {data ? (
                <Box style={{ height: `calc(100vh - ${GRID.rowHeight}px)` }}>
                    {view === "grid" ? (
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
                    ) : (
                        <LibraryList
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
                    )}
                </Box>
            ) : (
                <Center w={`calc(100vw - ${GRID.menuWidth}px)`} h={`calc(100vh - ${GRID.rowHeight}px)`}>
                    <Loader size="lg" />
                </Center>
            )}
        </Stack>
    );
}
