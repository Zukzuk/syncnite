import React from "react";
import { ActionIcon, Box, CloseButton } from "@mantine/core";
import { GameItem, ItemPositions } from "../../../types/types";
import { GRID, Z_INDEX } from "../../../lib/constants";
import { ItemContent } from "./ItemContent";
import { ItemBackground } from "./ItemBackground";
import { ItemRow } from "./ItemRow";
import { ItemCard } from "./ItemCard";
import { IconX } from "@tabler/icons-react";

function calcCardPosition(
    index: number,
    isOpen: boolean,
    positions: ItemPositions,
    isListView: boolean,
    openWidth: string,
    openHeight: string
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
    onToggleItem: (id: string) => void;
};

// Card component for a library item in grid view.
export const GridCard = React.memo(function GridCard({
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
    const { title } = item;

    const [isHovered, setIsHovered] = React.useState(false);

    const onToggleClickBounded = React.useCallback(
        (id?: string) => {
            id ? onToggleItem(id) : onToggleItem(item.id);
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
        openHeight
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
                backgroundColor: "var(--mantine-color-default-background)",
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
                    backgroundColor: !isListView || isOpen || !isHovered
                        ? undefined
                        : isDark 
                            ? "var(--mantine-color-dark-8)" 
                            : "var(--mantine-color-gray-1)",
                    border: isOpen
                        ? undefined
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
                            top: 10,
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
                    {!isOpen && isListView && (
                        <ItemRow
                            item={item}
                            isOpen={isOpen}
                        />
                    )}
                    {!isOpen && !isListView && (
                        <ItemCard
                            item={item}
                            isOpen={isOpen}
                        />
                    )}
                    {isOpen && (
                        <ItemRow
                            item={item}
                            isOpen={isOpen}
                        />
                    )}
                    {isOpen && (
                        <ItemContent
                            item={item}
                            isOpen={isOpen}
                            openWidth={openWidth}
                            openHeight={openHeight}
                            itemsAssociated={itemsAssociated}
                            onWallpaperBg={onWallpaperBg}
                            onToggleClickBounded={onToggleClickBounded}
                        />
                    )}
                </Box>

                <ItemBackground
                    item={item}
                    isOpen={isOpen}
                    wallpaperBg={wallpaperBg}
                />
            </Box>
        </Box>
    );
});
