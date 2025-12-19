import React from "react";
import { ActionIcon, Box } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { GameItem, ItemPositions, NavMode } from "../../types/types";
import { ItemContent } from "./components/ItemContent";
import { ItemBackground } from "./components/ItemBackground";
import { ItemRow } from "./components/ItemRow";
import { ItemCard } from "./components/ItemCard";
import { getTheme } from "../../theme";

function calcCardPosition(
    index: number,
    isOpen: boolean,
    positions: ItemPositions,
    isListView: boolean,
    openWidth: string,
    openHeight: string,
    GRID: ReturnType<typeof getTheme>["GRID"],
    Z_INDEX: ReturnType<typeof getTheme>["Z_INDEX"],
): {
    cardLeft: number;
    cardTop: number;
    cardWidth: number | string;
    cardHeight: number | string;
    cardZIndex: number;
} {
    const pos = positions[index] ?? { left: GRID.gap, top: GRID.gap };
    const cardWidth = isOpen || isListView ? openWidth : GRID.cardWidth;
    const cardHeight = isOpen
        ? openHeight
        : isListView
            ? GRID.rowHeight
            : GRID.cardHeight;
    const cardTop = pos.top;
    const cardLeft = isOpen || isListView ? 0 : pos.left;
    const cardZIndex = isOpen ? Z_INDEX.aboveBase : Z_INDEX.base;

    return {
        cardLeft,
        cardTop,
        cardWidth,
        cardHeight,
        cardZIndex,
    };
}

type Props = {
    item: GameItem;
    index: number;
    isOpen: boolean;
    isDark: boolean;
    openWidth: string;
    openHeight: string;
    isListView: boolean;
    itemsAssociated: GameItem[],
    positions: ItemPositions,
    wallpaperBg: boolean;
    onWallpaperBg: (value: boolean) => void;
    onToggleItem: (id: string, navMode?: NavMode) => void;
};

// Card component for a library item in grid view.
export const GridItem = React.memo(function GridItem({
    item,
    isOpen,
    isDark,
    index,
    openWidth,
    openHeight,
    isListView,
    itemsAssociated,
    positions,
    wallpaperBg,
    onWallpaperBg,
    onToggleItem,
}: Props): JSX.Element {
    const { title, isInstalled } = item;
    const [isHovered, setIsHovered] = React.useState(false);
    const { Z_INDEX, GRID } = getTheme();

    // Bounded onToggleItem to this item's ID if no ID is provided.
    const onToggleClickBounded = React.useCallback(
        (id?: string, navMode?: NavMode) => {
            const target = id ?? item.id;
            onToggleItem(target, navMode);
        },
        [onToggleItem, item.id]
    );

    const {
        cardLeft,
        cardTop,
        cardWidth,
        cardHeight,
        cardZIndex
    } = calcCardPosition(
        index,
        isOpen,
        positions,
        isListView,
        openWidth,
        openHeight,
        GRID,
        Z_INDEX,
    );

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
                            zIndex: Z_INDEX.aboveBase + 1,
                        }}
                    >
                        <IconX color="var(--interlinked-color-secondary)" size={18} />
                    </ActionIcon>
                )}

                <Box
                    style={{
                        position: "relative",
                        zIndex: Z_INDEX.base,
                        opacity: wallpaperBg ? 0 : 1,
                        willChange: "opacity",
                        transitionProperty: "opacity",
                        transitionDuration: "220ms",
                        transitionTimingFunction: "ease",
                    }}
                    w={"100%"}
                    h={isOpen ? openHeight : "100%"}
                >
                    {(isOpen || isListView) ? (
                        <ItemRow
                            item={item}
                            isOpen={isOpen}
                            isListView={isListView}
                        />
                    ) : null}

                    {(!isOpen && !isListView) ? (
                        <ItemCard
                            item={item}
                            isOpen={isOpen}
                            isListView={isListView}
                        />
                    ) : null}

                    {(isOpen) ? (
                        <ItemContent
                            item={item}
                            isOpen={isOpen}
                            openWidth={openWidth}
                            openHeight={openHeight}
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
                        wallpaperBg={wallpaperBg}
                    />
                ) : null}
                
            </Box>
        </Box>
    );
});
