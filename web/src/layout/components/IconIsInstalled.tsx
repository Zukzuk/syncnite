import { CSSProperties, memo } from "react";
import { ActionIcon, Box, Tooltip } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { InterLinkedGameItem } from "../../types/interlinked";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";

type Props = {
    isInstalled: InterLinkedGameItem["isInstalled"];
    isListView: boolean;
};

export const IconIsInstalled = memo(function IconIsInstalled({
    isInstalled,
    isListView,
}: Props) {
    if (!isInstalled) return null;

    const { grid } = useInterLinkedTheme();

    const ribbonIcon: CSSProperties = {
        position: "absolute",
        top: 1,
        right: 0,
        zIndex: grid.z.aboveBase,
        filter: "drop-shadow(0 0 6px rgba(0, 0, 0, 0.6))",
    };

    const normalIcon: CSSProperties = {
        position: "static",
        filter: "none",
        display: "flex",
        alignItems: "center",
    };

    const ribbonBackground: CSSProperties = {
        position: "absolute",
        top: -8,
        right: -18,
        width: 50,
        height: 30,
        background: "var(--interlinked-color-secondary)",
        transform: "rotate(45deg)",
        zIndex: grid.z.base,
    }

    return (
        <>
            {!isListView && <Box style={ribbonBackground} />}
            <Tooltip
                style={{ fontSize: 10 }}
                label="Marked as 'installed'"
                withArrow
                position="top"
            >
                <ActionIcon
                    style={isListView ? normalIcon : ribbonIcon}
                    aria-label="Marked as 'installed'"
                    color={isListView ? "var(--interlinked-color-secondary)" : "var(--interlinked-color-dark)"}
                    variant="transparent"
                    size="sm"
                >
                    <IconCheck size={isListView ? 17 : 14} stroke={2} />
                </ActionIcon>
            </Tooltip>
        </>
    );
});
