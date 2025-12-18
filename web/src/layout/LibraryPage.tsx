import React from "react";
import { Stack, Loader, Box, Center } from "@mantine/core";
import { INTERVAL_MS } from "../lib/constants";
import { useLibraryData } from "../features/library/hooks/useLibraryData";
import Library from "../features/library/Library";
import { getTheme } from "../theme";

export default function LibraryPage(): JSX.Element {
    const { libraryData, installedUpdatedAt } = useLibraryData({ pollMs: INTERVAL_MS });
    const { hasMenu, GRID } = getTheme();

    // Prevent body scrolling when on the library page
    React.useLayoutEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    if (!libraryData) {
        return (
            <Stack style={{ height: "100%", minHeight: 0 }}>
                <Center w={`calc(100vw - ${hasMenu ? GRID.navBarWidth : 0}px)`} h="100vh">
                    <Loader size="md" type="bars" />
                </Center>
            </Stack>
        );
    }

    return (
        <Stack style={{ height: "100%", minHeight: 0 }}>
            <Box w={`calc(100vw - ${hasMenu ? GRID.navBarWidth : 0}px)`} h="100vh">
                <Library
                    libraryData={libraryData}
                    installedUpdatedAt={installedUpdatedAt || ""}
                />
            </Box>
        </Stack>
    );
}
