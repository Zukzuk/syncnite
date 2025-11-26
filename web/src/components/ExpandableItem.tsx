import React, { useCallback } from "react";
import { Box } from "@mantine/core";
import { ViewMode } from "../lib/types";
import { Item } from "../features/library/hooks/useLibraryData";
import { ItemDetails } from "./ItemDetails";
import { ItemBackground } from "./ItemBackground";
import { RowItem } from "./RowItem";
import { GridItem } from "./GridItem";
import { Z_INDEX } from "../lib/constants";

type Props = {
    item: Item;
    isOpen: boolean;
    topOffset: number;
    openWidth: string;
    openHeight: string;
    view: ViewMode;
    onToggle: () => void;
};

export function ExpandableItem(props: Props) {
    const {
        item,
        isOpen,
        openWidth,
        openHeight,
        view,
        onToggle,
    } = props;

    const {
        id,
        title,
        isInstalled,
        bgUrl,
        coverUrl,
        isHidden,
    } = item;

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
            }
        },
        [onToggle]
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
            data-row-id={id}
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            aria-label={`${title}`}
            onKeyDown={onKeyDown}
            style={{
                ...(view === "list" ? outerListStyles : outerGridStyles),
            }}
            onClick={onToggle}
        >
            <Box
                style={{ 
                    opacity: isHidden ? 0.2 : 1,
                    position: "relative", 
                    top: 0, left: 0, zIndex: Z_INDEX.base, 
                }}
                w={isOpen ? openWidth : "100%"}
                h={isOpen ? openHeight : "100%"}
            >
                {!isOpen && view === "list" && <RowItem item={item} isOpen={isOpen} />}
                {!isOpen && view === "grid" && <GridItem item={item} isOpen={isOpen} />}
                {isOpen && <RowItem item={item} isOpen={isOpen} />}
                {isOpen && (
                    <ItemDetails
                        title={title}
                        coverUrl={coverUrl}
                        isOpen={isOpen}
                        onToggle={onToggle}
                    />
                )}
            </Box>
            <ItemBackground
                bgUrl={bgUrl}
                isOpen={isOpen}
            />
        </Box>
    );
}
