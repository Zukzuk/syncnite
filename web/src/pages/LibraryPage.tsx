import { useLayoutEffect } from "react";
import { Stack, Loader, Box, Center } from "@mantine/core";
import { INTERVAL_MS } from "../constants";
import Library from "../features/library/Library";
import { LibraryProvider } from "./LibraryContext";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";
import { usePlayniteData } from "../hooks/usePlayniteData";

export default function LibraryPage(): JSX.Element {
    const { libraryData, installedUpdatedAt } = usePlayniteData({ pollMs: INTERVAL_MS });
    const theme = useInterLinkedTheme();
    const { grid, hasNavbar, desktopMode } = theme;
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
                <Center w={`calc(100vw - ${!hasNavbar ? 0 : desktopMini ? grid.navBarMiniWidth : grid.navBarWidth}px)`} h="100vh">
                    <Loader size="md" type="bars" />
                </Center>
            </Stack>
        );
    }

    return (
        <Stack style={{ height: "100%", minHeight: 0 }}>
            <Box w={`calc(100vw - ${!hasNavbar ? 0 : desktopMini ? grid.navBarMiniWidth : grid.navBarWidth}px)`} h="100vh">
                <LibraryProvider>
                    <Library
                        libraryData={libraryData}
                        theme={theme}
                    />
                </LibraryProvider>
            </Box>
        </Stack>
    );
}
