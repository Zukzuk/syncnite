import React from "react";
import { Stack, Loader, Box, Center } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { GRID, INTERVAL_MS } from "../../lib/constants";
import { ViewMode } from "../../types/types";
import { useLibraryData } from "../../features/library/hooks/useLibraryData";
import LibraryGrid from "../../features/library/LibraryGrid";

export default function LibraryPage(): JSX.Element {
    const { libraryData, installedUpdatedAt } = useLibraryData({ pollMs: INTERVAL_MS });

    const [view, setView] = useLocalStorage<ViewMode>({
        key: "library.view",
        defaultValue: "grid",
    });

    if (!libraryData) {
        return (
            <Stack style={{ height: "100%", minHeight: 0 }}>
                <Center w={`calc(100vw - ${GRID.menuWidth}px)`} h={`calc(100vh)`}>
                    <Loader size="lg" />
                </Center>
            </Stack>
        );
    }

    return (
        <Stack style={{ height: "100%", minHeight: 0 }}>
            <Box style={{ height: `calc(100vh)` }}>
                <LibraryGrid
                    libraryData={libraryData}
                    view={view}
                    setView={setView}
                    installedUpdatedAt={installedUpdatedAt || ""}
                />
            </Box>
        </Stack>
    );
}
