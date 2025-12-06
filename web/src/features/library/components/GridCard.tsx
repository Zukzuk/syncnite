import React from "react";
import { Box } from "@mantine/core";
import { GameItem } from "../../../types/types";
import { Z_INDEX } from "../../../lib/constants";
import { ItemContent } from "./ItemContent";
import { ItemBackground } from "./ItemBackground";
import { ItemRow } from "./ItemRow";
import { ItemCard } from "./ItemCard";

type Props = {
    item: GameItem;
    isOpen: boolean;
    index: number;
    openWidth: string;
    openHeight: string;
    isListView: boolean;
    associatedBySeries: GameItem[];
    associatedByTags: GameItem[];
    associatedByYear: GameItem[];
    associatedByInstalled: GameItem[];
    containerLeft: number;
    containerTop: number;
    containerWidth: number | string;
    containerHeight: number | string;
    containerZIndex: number;
    onToggleItem: (id: string, index: number) => void;
    onAssociatedClick: (fromId: string, targetId: string) => void;
};

export const GridCard = React.memo(function GridCard({
    item,
    isOpen,
    index,
    openWidth,
    openHeight,
    isListView,
    associatedBySeries,
    associatedByTags,
    associatedByYear,
    associatedByInstalled,
    containerLeft,
    containerTop,
    containerWidth,
    containerHeight,
    containerZIndex,
    onToggleItem,
    onAssociatedClick,
}: Props): JSX.Element {
    const { title, isHidden, isInstalled } = item;

    const [isHovered, setIsHovered] = React.useState(false);
    const [bgIsHovered, setBgIsHovered] = React.useState(false);

    const handleToggle = React.useCallback(() => {
        onToggleItem(item.id, index);
        setBgIsHovered(false);
    }, [onToggleItem, item.id, index]);

    const handleAssociated = React.useCallback(
        (targetId: string) => onAssociatedClick(item.id, targetId),
        [onAssociatedClick, item.id]
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
                left: containerLeft,
                top: containerTop,
                width: containerWidth,
                height: containerHeight,
                zIndex: containerZIndex,
            }}
        >
            <Box
                role="card-button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-label={title}
                style={{
                    position: "relative",
                    overflow: "hidden",
                    isolation: "isolate",
                    cursor: "pointer",
                    userSelect: "none",
                    backgroundColor: isInstalled
                        ? "var(--mantine-primary-color-light)"
                        : "transparent",
                    border: isListView || isOpen
                        ? undefined
                        : isHovered
                            ? "2px solid var(--mantine-primary-color-4)"
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
                onClick={handleToggle}
            >
                <Box
                    aria-label="card-inner"
                    style={{
                        position: "relative",
                        zIndex: Z_INDEX.base,
                        opacity: bgIsHovered ? 0 : isHidden ? 0.2 : 1,
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
                            aria-label="item-row"
                            item={item}
                            isOpen={isOpen}
                        />
                    )}
                    {!isOpen && !isListView && (
                        <ItemCard
                            aria-label="item-card"
                            item={item}
                            isOpen={isOpen}
                        />
                    )}
                    {isOpen && (
                        <ItemRow
                            aria-label="item-row"
                            item={item}
                            isOpen={isOpen}
                        />
                    )}
                    {isOpen && (
                        <ItemContent
                            aria-label="item-content"
                            item={item}
                            isOpen={isOpen}
                            openWidth={openWidth}
                            openHeight={openHeight}
                            associatedBySeries={associatedBySeries}
                            associatedByTags={associatedByTags}
                            associatedByYear={associatedByYear}
                            associatedByInstalled={associatedByInstalled}
                            onToggleItem={handleToggle}
                            onAssociatedClick={handleAssociated}
                            onBgHovered={setBgIsHovered}
                        />
                    )}
                </Box>

                <ItemBackground
                    aria-label="item-background"
                    item={item}
                    isOpen={isOpen}
                    bgIsHovered={bgIsHovered}
                />
            </Box>
        </Box>
    );
});
