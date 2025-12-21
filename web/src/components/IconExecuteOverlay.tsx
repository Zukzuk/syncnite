import { Box } from "@mantine/core";
import { IconDownload, IconPlayerPlayFilled } from "@tabler/icons-react";
import { memo } from "react";

type Props = {
    type?: "default" | "circle";
    iconsSize?: number;
    title: string;
    w: number;
    h: number;
    isInstalled: boolean;
    isHovered: boolean;
};

export const IconExecuteOverlay = memo(function IconExecuteOverlay({
    type = "default",
    iconsSize = 20,
    title,
    w,
    h,
    isInstalled,
    isHovered,
}: Props) {
    const isCircle = type === "circle";

    return (
        <Box
            w={isCircle ? iconsSize * 2 : w}
            h={isCircle ? iconsSize * 2 : h}
            title={isInstalled ? `Play ${title}` : `Install ${title}`}
            style={{
                top: isCircle ? `calc(50% - ${iconsSize}px)` : 0,
                left: isCircle ? `calc(50% - ${iconsSize}px)` : 0,
                borderRadius: isCircle ? "50%" : 4,
                position: "absolute",
                backgroundColor: "var(--interlinked-color-body)",
                border: isCircle ? "2px solid var(--interlinked-color-primary-soft)" : undefined,
                opacity: isHovered ? 0.9 : 0,
                transition: "opacity 140ms ease",
            }}
        >
            <Box
                w={isCircle ? iconsSize * 2 : w}
                h={isCircle ? iconsSize * 2 : h}
                style={{
                    top: isCircle ? -2 : 0,
                    left: isCircle ? -2 : 0,
                    position: "relative",
                    display: "flex",
                    color: "var(--interlinked-color-primary-soft)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? "scale(1)" : "scale(0.96)",
                    transition: "opacity 140ms ease, transform 140ms ease",
                }}
            >
                {isInstalled ? (
                    <IconPlayerPlayFilled size={iconsSize} stroke={2} />
                ) : (
                    <IconDownload size={iconsSize + 2} stroke={2} />
                )}
            </Box>
        </Box>
    )
});