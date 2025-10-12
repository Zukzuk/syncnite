import React from "react";
import { Stack, Loader, Box, Center } from "@mantine/core";
import { GRID } from "../lib/constants";
import { useLibrary } from "../components/hooks/useLibrary";
import { LibraryList } from "../components/library/LibraryList";

export default function LibraryPage() {
    const [filtered, setFiltered] = React.useState(0);
    const [total, setTotal] = React.useState(0);
    const { data, installedUpdatedAt } = useLibrary({ pollMs: 4000 });

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
