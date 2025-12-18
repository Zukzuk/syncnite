import React from "react";
import { ActionIcon } from "@mantine/core";
import { IconMaximize } from "@tabler/icons-react";
import { getTheme } from "../theme";

type Props = {
    onHoverChange: (isHovered: boolean) => void;
};

export const IconShowMaximized = React.memo(function IconShowMaximized({ onHoverChange }: Props) {

    const { Z_INDEX } = getTheme();

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
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            <IconMaximize size={14} stroke={2} />
        </ActionIcon>
    );
});
