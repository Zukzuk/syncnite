import React, { useCallback } from "react";
import { Box } from "@mantine/core";
import { GameItem } from "../../../types/types";
import { Z_INDEX } from "../../../lib/constants";
import { ItemContent } from "./ItemContent";
import { ItemBackground } from "./ItemBackground";
import { ItemRow } from "./ItemRow";
import { ItemCard } from "./ItemCard";
import { getTheme } from "../../../lib/utils";

type Props = {
    item: GameItem;
    isOpen: boolean;
    openHeight: string;
    isListView: boolean;
    relatedBySeries?: GameItem[];
    relatedByTags?: GameItem[];
    relatedByYear?: GameItem[];
    containerLeft: number;
    containerTop: number;
    containerWidth: number | string;
    containerHeight: number | string;
    containerZIndex: number;
    onToggleItem: () => void;
    onAssociatedClick: (targetId: string) => void;
};

export function ItemExpandable({
    item,
    isOpen,
    openHeight,
    isListView,
    relatedBySeries,
    relatedByTags,
    relatedByYear,
    containerLeft,
    containerTop,
    containerWidth,
    containerHeight,
    containerZIndex,
    onToggleItem,
    onAssociatedClick,
}: Props): JSX.Element {
    const { id, title, isHidden, isInstalled } = item;

    const [isHovered, setIsHovered] = React.useState(false);
    const isHoveredAndClosed = isHovered && !isOpen;

    return (
        <Box
            aria-label="library-item-container"
            role="library-item-container"
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
                key={id}
                role="library-item-button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-label={title}
                style={{
                    position: "relative",
                    overflow: "hidden",
                    isolation: "isolate",
                    cursor: "pointer",
                    userSelect: "none",
                    transition: "background-color 140ms ease",
                    backgroundColor: isInstalled
                        ? "var(--mantine-primary-color-light)"
                        : "transparent",
                    border: !isListView && isHoveredAndClosed
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
                onClick={onToggleItem}
            >
                <Box
                    aria-label="library-item-inner"
                    role="library-item-inner"
                    style={{
                        opacity: isHidden ? 0.2 : 1,
                        position: "relative",
                        zIndex: Z_INDEX.base,
                    }}
                    w={"100%"}
                    h={isOpen ? openHeight : "100%"}
                >
                    {!isOpen && isListView && (
                        <ItemRow
                            aria-label="library-row-item"
                            item={item}
                            isOpen={isOpen}
                        />
                    )}
                    {!isOpen && !isListView && (
                        <ItemCard
                            aria-label="library-grid-item"
                            item={item}
                            isOpen={isOpen}
                        />
                    )}
                    {isOpen && (
                        <ItemRow
                            aria-label="library-row-item"
                            item={item}
                            isOpen={isOpen}
                        />
                    )}
                    {isOpen && (
                        <ItemContent
                            aria-label="library-item-details"
                            item={item}
                            isOpen={isOpen}
                            relatedBySeries={relatedBySeries}
                            relatedByTags={relatedByTags}
                            relatedByYear={relatedByYear}
                            onToggleItem={onToggleItem}
                            onAssociatedClick={onAssociatedClick}
                        />
                    )}
                </Box>

                <ItemBackground
                    aria-label="library-item-bg"
                    item={item}
                    isOpen={isOpen}
                />
            </Box>
        </Box>
    );
}
