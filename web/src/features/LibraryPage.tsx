import { useLayoutEffect } from "react";
import { Stack, Loader, Box, Center } from "@mantine/core";
import { INTERVAL_MS } from "../constants";
import Library from "../features/library/Library";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";
import { LibraryProvider } from "./LibraryContext";
import { usePlayniteData } from "../features/library/hooks/usePlayniteData";

export default function LibraryPage(): JSX.Element {
    const { libraryData, installedUpdatedAt } = usePlayniteData({ pollMs: INTERVAL_MS });
    const { hasMenu, grid, desktopMode } = useInterLinkedTheme();
    const desktopMini = desktopMode === "mini";

    // Prevent body scrolling when on the library page
    useLayoutEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    if (!libraryData) {
        return (
            <Stack style={{ height: "100%", minHeight: 0 }}>
                <Center w={`calc(100vw - ${desktopMini ? grid.navBarMiniWidth : hasMenu ? grid.navBarWidth : 0}px)`} h="100vh">
                    <Loader size="md" type="bars" />
                </Center>
            </Stack>
        );
    }

    return (
        <Stack style={{ height: "100%", minHeight: 0 }}>
            <Box w={`calc(100vw - ${desktopMini ? grid.navBarMiniWidth : hasMenu ? grid.navBarWidth : 0}px)`} h="100vh">
                <LibraryProvider>
                    <Library
                        libraryData={libraryData}
                        installedUpdatedAt={installedUpdatedAt || ""}
                    />
                </LibraryProvider>
            </Box>
        </Stack>
    );
}
