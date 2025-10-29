import React, { useCallback } from "react";
import { Box } from "@mantine/core";
import { GRID } from "../lib/constants";
import { ViewMode } from "../lib/types";
import { Item } from "../features/library/hooks/useLibrary";
import { ItemDetails } from "./ItemDetails";
import { ItemBackground } from "./ItemBackground";
import { RowItem } from "./RowItem";
import { GridItem } from "./GridItem";

type ExpandableItemWrapperProps = {
    item: Item;
    collapseOpen: boolean;
    everOpened: boolean;
    topOffset: number;
    isGroupedList?: boolean;
    layout: ViewMode;
    onToggle: () => void;
};

export function ExpandableItemWrapper(props: ExpandableItemWrapperProps) {
    const {
        item,
        collapseOpen,
        everOpened,
        topOffset,
        isGroupedList = false,
        layout,
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
        paddingLeft: 12,
    };

    const outerGridStyles: React.CSSProperties = {
        ...outerBase,
        borderRadius: 4,
        padding: 2,
    };

    const openWidth = `calc(100vw - ${GRID.menuWidth}px - 12px - 15px)`;
    const openHeight = `calc(100vh - ${topOffset}px ${isGroupedList ? "- 38px" : ""} - ${GRID.smallBox}px - 12px)`;

    return (
        <Box
            data-row-id={id}
            className={`game-row${isHidden ? " is-dim" : ""}${isInstalled ? " is-installed" : ""
                }`}
            role="button"
            tabIndex={0}
            aria-expanded={collapseOpen}
            aria-label={`${title}`}
            onKeyDown={onKeyDown}
            style={layout === "list" ? outerListStyles : outerGridStyles}
            onClick={onToggle}
        >
            <Box
                style={{ position: "relative", top: 0, left: 0, zIndex: 1 }}
                w={collapseOpen ? openWidth : "100%"}
                h={collapseOpen ? openHeight : "100%"}
            >
                {!collapseOpen && layout === "list" && <RowItem item={item} collapseOpen={collapseOpen} />}
                {!collapseOpen && layout === "grid" && <GridItem item={item} collapseOpen={collapseOpen} />}
                {/* expanded panel: identical everywhere */}
                {collapseOpen && <RowItem item={item} collapseOpen={collapseOpen} />}
                {collapseOpen && (
                    <ItemDetails
                        title={title}
                        coverUrl={coverUrl}
                        collapseOpen={collapseOpen}
                        everOpened={everOpened}
                        onToggle={onToggle}
                    />
                )}
            </Box>
            <ItemBackground
                bgUrl={bgUrl}
                collapseOpen={collapseOpen}
                everOpened={everOpened}
            />
        </Box>
    );
}
