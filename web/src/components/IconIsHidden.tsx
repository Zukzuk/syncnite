import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconEyeOff } from "@tabler/icons-react";
import { GameItem } from "../types/types";
import { Z_INDEX } from "../lib/constants";

type Props = {
    isHidden: GameItem["isHidden"];
    isListView: boolean;
};

export const IconIsHidden = React.memo(function IconIsHidden({
    isHidden,
    isListView,
}: Props) {
    if (!isHidden) return null;

    const cardStyle: React.CSSProperties = {
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: Z_INDEX.base,
        filter: "drop-shadow(0 0 6px rgba(0, 0, 0, 0.6))",
    };

    const rowStyle: React.CSSProperties = {
        position: "static",
        filter: "none",
        display: "flex",
        alignItems: "center",
    };

    return (
        <Tooltip
            style={{ fontSize: 10 }}
            label="Marked as 'hidden'"
            withArrow
            position="top"
        >
            <ActionIcon
                style={isListView ? rowStyle : cardStyle}
                aria-label="Marked as 'hidden'"
                variant="subtle"
                size="sm"
            >
                <IconEyeOff size={14} stroke={2} />
            </ActionIcon>
        </Tooltip>
    );
});
