import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconMaximize } from "@tabler/icons-react";
import { GameItem } from "../types/types";
import { Z_INDEX } from "../lib/constants";

type Props = {
    onHoverChange: (isHovered: boolean) => void;
};

export const IconShowMaximized = React.memo(function IconShowMaximized({ onHoverChange }: Props) {
    const cardStyle: React.CSSProperties = {
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: Z_INDEX.aboveBase,
        filter: "drop-shadow(0 0 6px rgba(0, 0, 0, 0.6))",
    };

    return (
        <ActionIcon
            style={cardStyle}
            aria-label="Marked as 'hidden'"
            variant="subtle"
            size="sm"
            onMouseOver={() => onHoverChange(true)}
            onMouseOut={() => onHoverChange(false)}
        >
            <IconMaximize size={14} stroke={2} />
        </ActionIcon>
    );
});
