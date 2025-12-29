import { Box } from "@mantine/core";
import { IconDownload, IconPlayerPlayFilled } from "@tabler/icons-react";
import { memo, useState } from "react";
import { ItemIconOverlayType } from "../types/app";

type Props = {
    type?: ItemIconOverlayType;
    iconSize?: number;
    title: string;
    w: number;
    h: number;
    isInstalled: boolean;
    showOverlay: boolean;
    link?: string;
};

export const IconExecuteOverlay = memo(function IconExecuteOverlay({
    type = "default",
    iconSize = 20,
    title,
    w,
    h,
    isInstalled,
    showOverlay,
    link,
}: Props) {
    const isCircle = type === "circle";
    const [hovered, setHovered] = useState(false);

    const overlaySize = isCircle ? iconSize * 2 : undefined;
    const width = overlaySize ?? w;
    const height = overlaySize ?? h;
    const offset = isCircle ? `calc(50% - ${iconSize}px)` : 0;
    const borderRadius = isCircle ? "50%" : 4;

    const border = isCircle
        ? hovered
            ? "2px solid var(--interlinked-color-secondary)"
            : "2px solid var(--interlinked-color-primary-soft)"
        : undefined;

    return (
        <Box
            w={width}
            h={height}
            title={`${isInstalled ? "Play" : "Install"} ${title}`}
            style={{
                position: "absolute",
                top: offset,
                left: offset,
                borderRadius,
                backgroundColor: "var(--interlinked-color-body)",
                border,
                opacity: showOverlay ? 0.9 : 0,
                transform: showOverlay ? "scale(1)" : "scale(0.96)",
                transition: "opacity 220ms ease, transform 220ms ease",
            }}
        >
            <Box
                component="a"
                href={link}
                w={width}
                h={height}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    position: "relative",
                    top: isCircle ? -2 : 0,
                    left: isCircle ? -2 : 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: hovered
                        ? "var(--interlinked-color-secondary)"
                        : "var(--interlinked-color-primary-soft)",
                    opacity: showOverlay ? 1 : 0,
                    textDecoration: "none",
                }}
            >
                {isInstalled ? (
                    <IconPlayerPlayFilled size={iconSize} stroke={2} />
                ) : (
                    <IconDownload size={iconSize + 2} stroke={2} />
                )}
            </Box>
        </Box>
    );
});
