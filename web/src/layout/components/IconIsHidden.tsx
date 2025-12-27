import { CSSProperties, memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconEyeOff } from "@tabler/icons-react";
import { InterLinkedGameItem } from "../../types/interlinked";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";

type Props = {
    isHidden: InterLinkedGameItem["isHidden"];
    isListView: boolean;
};

export const IconIsHidden = memo(function IconIsHidden({
    isHidden,
    isListView,
}: Props) {
    if (!isHidden) return null;

    const { grid } = useInterLinkedTheme();

    const cardStyle: CSSProperties = {
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: grid.z.base,
        filter: "drop-shadow(0 0 6px rgba(0, 0, 0, 0.6))",
    };

    const rowStyle: CSSProperties = {
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
                color="var(--interlinked-color-warning)"
                aria-label="Marked as 'hidden'"
                variant="subtle"
                size="sm"
            >
                <IconEyeOff size={14} stroke={2} />
            </ActionIcon>
        </Tooltip>
    );
});
