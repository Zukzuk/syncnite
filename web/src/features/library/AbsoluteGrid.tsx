import React, { useEffect, useRef } from "react";
import { Box } from "@mantine/core";
import { GridCard } from "./components/GridCard";
import { AlphabeticalRail } from "./components/AlphabeticalRail";
import { useGrid } from "./hooks/useGrid";
import { GameItem, UIControls, UIDerivedData } from "../../types/types";

type Props = {
    ui: UIControls;
    derived: UIDerivedData;
    controlsH: number;
    sortH: number;
    installedUpdatedAt?: string;
    readOpenItemInView: (value: boolean) => void;
};

// Main grid component for the library view, handling item layout and rendering.
export function AbsoluteGrid({
    ui,
    derived,
    controlsH,
    sortH,
    installedUpdatedAt,
    readOpenItemInView,
}: Props) {
    const gridRef = useRef<HTMLDivElement | null>(null);
    const { isListView } = ui;
    const { itemsSorted, itemsAssociated } = derived;
    const [wallpaperBg, onWallpaperBg] = React.useState(false);

    const {
        containerHeight,
        positions,
        visibleRange,
        railCounts,
        activeLetter,
        openWidth,
        openHeight,
        openIds,
        hasOpenItemInView,
        onScrollJump,
        onToggleItem,
    } = useGrid({
        gridRef,
        controlsH,
        sortH,
        ui,
        derived,
    });

    useEffect(() => {
        readOpenItemInView(hasOpenItemInView);
    }, [hasOpenItemInView, readOpenItemInView]);

    return (
        <>
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
                    .map((item: GameItem, i: number) => {
                        const key = `${item.id}|${installedUpdatedAt}`;
                        const index = visibleRange.startIndex + i;
                        const isOpen = openIds.has(item.id);

                        return (
                            <GridCard
                                key={key}
                                item={item}
                                index={index}
                                isOpen={isOpen}
                                positions={positions}
                                openWidth={openWidth}
                                openHeight={openHeight}
                                isListView={isListView}
                                itemsAssociated={itemsAssociated}
                                wallpaperBg={wallpaperBg}
                                onWallpaperBg={onWallpaperBg}
                                onToggleItem={onToggleItem}
                            />
                        );
                    })}
            </Box>

            {ui.sortKey === "title" && !wallpaperBg && (
                <AlphabeticalRail
                    activeLetter={activeLetter}
                    railCounts={railCounts}
                    onScrollJump={onScrollJump}
                />
            )}
        </>
    );
}
