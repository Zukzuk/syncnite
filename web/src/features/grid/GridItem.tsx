import { memo, useState } from "react";
import { ActionIcon, Box } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { InterLinkedDynamicGrid, InterLinkedItem, InterLinkedGrid } from "../../types/interlinked";
import { DesktopMode, HistoryNavMode } from "../../types/app";
import { useGridItem } from "./hooks/useGridItem";
import { ItemRow } from "./components/ItemRow";
import { ItemCard } from "./components/ItemCard";
import { ItemBackground } from "./components/ItemBackground";
import { AssociatedContent } from "../associated/AssociatedContent";
import { isGame } from "../../utils";

type Props = {
    item: InterLinkedItem;
    index: number;
    isOpen: boolean;
    isDark: boolean;
    isListView: boolean;
    wallpaperBg: boolean;
    desktopMode: DesktopMode;
    hasNavbar: boolean;
    isWidescreen: boolean;
    isDesktop: boolean;
    itemsAssociated: InterLinkedItem[],
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
    onWallpaperBg: (value: boolean) => void;
    onToggleItem: (id: string, navMode?: HistoryNavMode) => void;
};

// Card component for a library item in grid view.
export const GridItem = memo(function GridItem({
    item,
    isOpen,
    index,
    isListView,
    itemsAssociated,
    wallpaperBg,
    grid,
    dynamicGrid,
    isDark,
    hasNavbar,
    isWidescreen,
    isDesktop,
    onWallpaperBg,
    onToggleItem,
}: Props): JSX.Element {
    const { title } = item;
    const isInstalled = isGame(item) ? item.isInstalled : false;
    const [isHovered, setIsHovered] = useState(false);

    const {
        cardLeft,
        cardTop,
        cardWidth,
        cardHeight,
        cardZIndex,
        onToggleClickBounded,
    } = useGridItem({
        item,
        index,
        isOpen,
        positions: dynamicGrid.positions,
        isListView,
        grid,
        dynamicGrid,
        onToggleItem,
    });

    return (
        <Box
            aria-label="grid-card"
            role="card"
            style={{
                display: "flex",
                position: "absolute",
                boxSizing: "border-box",
                flexDirection: "column",
                overflow: "hidden",
                left: cardLeft,
                top: cardTop,
                width: cardWidth,
                height: cardHeight,
                zIndex: cardZIndex,
                cursor: isOpen ? "default" : "pointer",
            }}
        >
            <Box
                tabIndex={0}
                aria-expanded={isOpen}
                aria-label={title}
                style={{
                    position: "relative",
                    overflow: "hidden",
                    isolation: "isolate",
                    userSelect: "none",
                    backgroundColor:
                        isInstalled && !isOpen && ((isListView && !isHovered) || (!isListView && isHovered))
                            ? "var(--interlinked-color-secondary-softer)"
                            : isInstalled && !isOpen && (isListView && isHovered)
                                ? "var(--interlinked-color-secondary-soft)"
                                : isOpen || !isHovered
                                    ? undefined
                                    : isDark
                                        ? "var(--mantine-color-dark-8)"
                                        : "var(--mantine-color-gray-1)",
                    border: isOpen
                        ? undefined
                        : isInstalled && !isListView
                            ? "2px solid var(--interlinked-color-secondary)"
                            : isHovered && !isListView
                                ? "2px solid var(--interlinked-color-primary-soft)"
                                : "2px solid transparent",
                    borderRadius: isListView ? 0 : isOpen ? 0 : 4,
                    padding:
                        isListView || isOpen
                            ? "0px 0px 0px 12px"
                            : "0px",
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onMouseDown={() => setIsHovered(false)}
                onClick={!isOpen ? () => onToggleClickBounded() : undefined}
            >
                {isOpen && (
                    <ActionIcon
                        variant="subtle"
                        size="lg"
                        radius="xl"
                        color={"var(--interlinked-color-secondary)"}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleClickBounded();
                        }}
                        style={{
                            position: "absolute",
                            top: 13,
                            right: 30,
                            zIndex: grid.z.aboveBase + 1,
                        }}
                    >
                        <IconX color="var(--interlinked-color-secondary)" size={18} />
                    </ActionIcon>
                )}

                <Box
                    style={{
                        position: "relative",
                        zIndex: grid.z.base,
                        opacity: wallpaperBg ? 0 : 1,
                        willChange: "opacity",
                        transitionProperty: "opacity",
                        transitionDuration: "220ms",
                        transitionTimingFunction: "ease",
                    }}
                    w={"100%"}
                    h={isOpen ? dynamicGrid.gridViewportH : "100%"}
                >
                    {(isOpen || isListView) ? (
                        <ItemRow
                            item={item}
                            isOpen={isOpen}
                            grid={grid}
                            hasNavbar={hasNavbar}
                            isListView={isListView}
                            isWidescreen={isWidescreen}
                            isDesktop={isDesktop}
                        />
                    ) : null}

                    {(!isOpen && !isListView) ? (
                        <ItemCard
                            item={item}
                            isOpen={isOpen}
                            grid={grid}
                            isListView={isListView}
                        />
                    ) : null}

                    {(isOpen) ? (
                        <AssociatedContent
                            item={item}
                            isOpen={isOpen}
                            isDark={isDark}
                            grid={grid}
                            dynamicGrid={dynamicGrid}
                            itemsAssociated={itemsAssociated}
                            onWallpaperBg={onWallpaperBg}
                            onToggleClickBounded={onToggleClickBounded}
                        />
                    ) : null}
                </Box>

                {(isOpen) ? (
                    <ItemBackground
                        item={item}
                        isOpen={isOpen}
                        isDark={isDark}
                        grid={grid}
                        wallpaperBg={wallpaperBg}
                    />
                ) : null}

            </Box>
        </Box>
    );
});
