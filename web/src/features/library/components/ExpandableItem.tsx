import React, { useCallback } from "react";
import { Box } from "@mantine/core";
import { GameItem, ViewMode } from "../../../types/types";
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
    onToggleItem: () => void;
};

export function ExpandableItem({ item, isOpen, openHeight, isListView, onToggleItem }: Props): JSX.Element {
    const { id, title, bgUrl, coverUrl, isHidden, isInstalled } = item;

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggleItem();
            }
        },
        [onToggleItem]
    );

    const outerBase: React.CSSProperties = {
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        cursor: "pointer",
        userSelect: "none",
        transition: "background-color 140ms ease",
        backgroundColor: isInstalled
            ? "var(--mantine-primary-color-light)"
            : "transparent",
    };

    const outerListStyles: React.CSSProperties = {
        ...outerBase,
        borderBottom: "1px solid var(--mantine-color-default-border)",
        padding: "0px 0px 0px 12px",
    };

    const outerGridStyles: React.CSSProperties = {
        ...outerBase,
        borderRadius: isOpen ? 0 : 4,
        padding: isOpen ? "0px 0px 0px 12px" : "2px 2px 2px 2px",
    };

    return (
        <Box
            key={id}
            role="library-item-button"
            tabIndex={0}
            aria-expanded={isOpen}
            aria-label={`${title}`}
            onKeyDown={onKeyDown}
            style={{ ...(isListView ? outerListStyles : outerGridStyles)}}
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
                {!isOpen && isListView && <RowItem item={item} isOpen={isOpen} />}
                {!isOpen && !isListView && <GridItem item={item} isOpen={isOpen} />}
                {isOpen && <RowItem item={item} isOpen={isOpen} />}
                {isOpen && <ItemDetails item={item} isOpen={isOpen} onToggleItem={onToggleItem} />}
            </Box>

            <ItemBackground aria-label="library-item-bg" bgUrl={bgUrl} isOpen={isOpen} />
        </Box>
    );
}
