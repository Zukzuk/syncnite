import { CSSProperties, memo } from "react";
import { ActionIcon } from "@mantine/core";
import { IconMaximize } from "@tabler/icons-react";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";

type Props = {
    onHoverChange: (isHovered: boolean) => void;
};

export const IconShowMaximized = memo(function IconShowMaximized({ onHoverChange }: Props) {

    const { grid } = useInterLinkedTheme();

    const cardStyle: CSSProperties = {
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: grid.z.aboveBase,
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
