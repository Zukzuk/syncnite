import React from "react";
import { Box } from "@mantine/core";
import { GameItem, ItemPositions } from "../../../types/types";
import { GRID, Z_INDEX } from "../../../lib/constants";
import { ItemContent } from "./ItemContent";
import { ItemBackground } from "./ItemBackground";
import { ItemRow } from "./ItemRow";
import { ItemCard } from "./ItemCard";

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
    openWidth: string;
    openHeight: string;
    isListView: boolean;
    itemsAssociated: GameItem[],
    positions: ItemPositions,
    wallpaperBg: boolean;
    onWallpaperBg: (value: boolean) => void;
    onToggleItem: (id: string, index: number) => void;
};

// Card component for a library item in grid view.
export const GridCard = React.memo(function GridCard({
    item,
    isOpen,
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
        (associatedTarget: {id: string, index: number} | null = null) => {
            if (wallpaperBg) return;
            console.log(associatedTarget, item.id, index);
            associatedTarget
                ? onToggleItem(associatedTarget.id, associatedTarget.index)
                : onToggleItem(item.id, index);
        },
        [onToggleItem, item.id, index]
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
            }}
        >
            <Box
                role="grid-card-button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-label={title}
                style={{
                    position: "relative",
                    overflow: "hidden",
                    isolation: "isolate",
                    cursor: "pointer",
                    userSelect: "none",
                    border: isListView || isOpen
                        ? undefined
                        : isHovered
                            ? "2px solid var(--interlinked-color-primary-soft)"
                            : "2px solid transparent",
                    borderBottom: isListView
                        ? "1px solid var(--mantine-color-default-border)"
                        : undefined,
                    borderRadius: isListView
                        ? 0
                        : isOpen
                            ? 0
                            : 4,
                    padding:
                        isListView || isOpen
                            ? "0px 0px 0px 12px"
                            : "0px",
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onMouseDown={() => setIsHovered(false)}
                onClick={() => onToggleClickBounded()}
            >
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
