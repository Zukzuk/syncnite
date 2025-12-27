import { useRef, useState } from "react";
import { Box } from "@mantine/core";
import { useGrid } from "./hooks/useGrid";
import { GridItem } from "./GridItem";
import { useAlphabetRail } from "./hooks/useAlphabetRail";
import { AlphabeticalRail } from "./components/AlphabeticalRail";
import { UIControls, UIDerivedData } from "../../../../types/app";
import { InterLinkedGameItem, InterLinkedTheme } from "../../../../types/interlinked";

type Props = {
    ui: UIControls;
    derived: UIDerivedData;
    theme: InterLinkedTheme;
    controlsH: number;
    sortH: number;
    installedUpdatedAt?: string;
};

// Main grid component for the library view, handling item layout and rendering.
export function Grid({
    ui,
    derived,
    theme,
    controlsH,
    sortH,
    installedUpdatedAt,
}: Props) {
    const { isListView } = ui;
    const { itemsSorted, itemsAssociated } = derived;
    const { hasNavbar, grid, desktopMode, isDark, isWidescreen, isDesktop } = theme;

    const [wallpaperBg, onWallpaperBg] = useState(false);
    const gridRef = useRef<HTMLDivElement | null>(null);

    // Hook to manage grid layout, scrolling, and item toggling.
    const {
        containerHeight,
        positions,
        visibleRange,
        cssOpenWidth,
        cssOpenHeight,
        openIds,
        dynamicGrid,
        scrollItemIntoView,
        onToggleItemWithNav,
    } = useGrid({
        gridRef,
        controlsH,
        sortH,
        ui,
        derived,
        grid,
        hasNavbar,
        desktopMode,
    });

    // Hook to manage alphabetical rail state and interactions.
    const { 
        railCounts, 
        activeLetter, 
        onScrollJump 
    } = useAlphabetRail({
        ui,
        derived,
        visibleRange,
        scrollItemIntoView,
    });

    return (
        <Box style={{ position: "relative", flex: 1, overflow: "auto" }}>
            <Box
                ref={gridRef}
                aria-label="absolute-grid"
                role="library"
                style={{
                    flex: 1,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    overflowX: "hidden",
                    boxShadow: isDark
                        ? "inset 0 0 12px rgba(0, 0, 0, 0.7)"
                        : "inset 0 0 12px rgba(0, 0, 0, 0.2)",
                }}
            >
                <Box
                    aria-hidden
                    role="grid-height-spacer"
                    style={{
                        width: "100%",
                        height: containerHeight,
                    }}
                />

                {itemsSorted
                    .slice(visibleRange.startIndex, visibleRange.endIndex)
                    .map((item: InterLinkedGameItem, i: number) => {
                        const key = `${item.id}|${installedUpdatedAt}`;
                        const index = visibleRange.startIndex + i;
                        const isOpen = openIds.has(item.id);

                        return (
                            <GridItem
                                key={key}
                                item={item}
                                index={index}
                                isOpen={isOpen}
                                positions={positions}
                                cssOpenWidth={cssOpenWidth}
                                cssOpenHeight={cssOpenHeight}
                                isListView={isListView}
                                itemsAssociated={itemsAssociated}
                                wallpaperBg={wallpaperBg}
                                grid={dynamicGrid}
                                isDark={isDark}
                                desktopMode={desktopMode}
                                hasNavbar={hasNavbar}
                                isWidescreen={isWidescreen}
                                isDesktop={isDesktop}
                                onWallpaperBg={onWallpaperBg}
                                onToggleItem={(id) => onToggleItemWithNav(id, "push")}
                            />
                        );
                    })}
            </Box>

            {ui.sortKey === "title" && !wallpaperBg && (
                <AlphabeticalRail
                    grid={dynamicGrid}
                    activeLetter={activeLetter}
                    railCounts={railCounts}
                    onScrollJump={onScrollJump}
                />
            )}
        </Box>
    );
}
