import React, { useCallback } from "react";
import { Box } from "@mantine/core";
import { GameItem } from "../../../types/types";
import { Z_INDEX } from "../../../lib/constants";
import { ItemDetails } from "./ItemDetails";
import { ItemBackground } from "./ItemBackground";
import { RowItem } from "./RowItem";
import { GridItem } from "./GridItem";

type Props = {
    item: GameItem;
    isOpen: boolean;
    topOffset: number;
    openHeight: string;
    isListView: boolean;
    relatedBySeries?: GameItem[];
    relatedByTags?: GameItem[];
    relatedByYear?: GameItem[];
    onToggleItem: () => void;
    onAssociatedClick: (targetId: string) => void;
};

export function ExpandableItem({
    item,
    isOpen,
    openHeight,
    isListView,
    relatedBySeries,
    relatedByTags,
    relatedByYear,
    onToggleItem,
    onAssociatedClick,
}: Props): JSX.Element {
    const { id, title, isHidden, isInstalled } = item;

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggleItem();
            }
        },
        [onToggleItem]
    );

    return (
        <Box
            key={id}
            role="library-item-button"
            tabIndex={0}
            aria-expanded={isOpen}
            aria-label={`${title}`}
            onKeyDown={onKeyDown}
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
                borderBottom: isListView 
                    ? "1px solid var(--mantine-color-default-border)" 
                    : undefined,
                borderRadius: isListView 
                    ? 0 : 
                    isOpen ? 0 : 4,
                padding: (isListView || isOpen) 
                    ? "0px 0px 0px 12px" 
                    : "2px 2px 2px 2px",
            }}
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
                {!isOpen && isListView && <RowItem aria-label="library-row-item" item={item} isOpen={isOpen} />}
                {!isOpen && !isListView && <GridItem aria-label="library-grid-item" item={item} isOpen={isOpen} />}
                {isOpen && <RowItem aria-label="library-row-item" item={item} isOpen={isOpen} />}
                {isOpen && (
                    <ItemDetails
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
    );
}
