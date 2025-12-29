import { useRef, useState } from "react";
import { Box } from "@mantine/core";
import { useGrid } from "./hooks/useGrid";
import { useAlphabetRail } from "./hooks/useAlphabetRail";
import { AlphabeticalRail } from "./components/AlphabeticalRail";
import { UIControls, UIDerivedData } from "../../types/app";
import { InterLinkedGameItem, InterLinkedTheme } from "../../types/interlinked";
import { GridItem } from "./GridItem";

type Props = {
    ui: UIControls;
    derived: UIDerivedData;
    theme: InterLinkedTheme;
};

// Main grid component for the library view, handling item layout and rendering.
export function Grid({
    ui,
    derived,
    theme,
}: Props) {
    const { isListView } = ui;
    const { itemsSorted, itemsAssociated } = derived;
    const { hasNavbar, grid, desktopMode, isDark, isWidescreen, isDesktop } = theme;

    const [wallpaperBg, onWallpaperBg] = useState(false);
    const gridRef = useRef<HTMLDivElement | null>(null);

    // Hook to manage grid layout, scrolling, and item toggling.
    const {
        openIds,
        dynamicGrid,
        scrollItemIntoView,
        onToggleItemWithNav,
    } = useGrid({
        gridRef,
        grid,
        ui,
        derived,
        isListView,
    });

    // Hook to manage alphabetical rail state and interactions.
    const {
        railCounts,
        activeLetter,
        onScrollJump
    } = useAlphabetRail({
        ui,
        derived,
        visibleRange: dynamicGrid.visibleRange,
        scrollItemIntoView,
    });

    return (
        <Box 
            style={{ 
                position: "relative", 
                flex: 1, 
                overflow: "auto", 
                minWidth: grid.minSiteWidth 
            }}
        >
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
                        height: dynamicGrid.gridTotalHeight,
                    }}
                />

                {itemsSorted
                    .slice(dynamicGrid.visibleRange.startIndex, dynamicGrid.visibleRange.endIndex)
                    .map((item: InterLinkedGameItem, i: number) => {
                        const index = dynamicGrid.visibleRange.startIndex + i;
                        const isOpen = openIds.has(item.id);

                        return (
                            <GridItem
                                key={item.id}
                                item={item}
                                index={index}
                                isOpen={isOpen}
                                isDark={isDark}
                                isListView={isListView}
                                itemsAssociated={itemsAssociated}
                                wallpaperBg={wallpaperBg}
                                desktopMode={desktopMode}
                                hasNavbar={hasNavbar}
                                isWidescreen={isWidescreen}
                                isDesktop={isDesktop}
                                grid={grid}
                                dynamicGrid={dynamicGrid}
                                onWallpaperBg={onWallpaperBg}
                                onToggleItem={(id) => onToggleItemWithNav(id, "push")}
                            />
                        );
                    })}
            </Box>

            {ui.sortKey === "title" && !wallpaperBg && (
                <AlphabeticalRail
                    grid={grid}
                    activeLetter={activeLetter}
                    railCounts={railCounts}
                    onScrollJump={onScrollJump}
                />
            )}
        </Box>
    );
}
