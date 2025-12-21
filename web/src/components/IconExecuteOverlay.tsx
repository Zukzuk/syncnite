import { Box } from "@mantine/core";
import { IconDownload, IconPlayerPlayFilled } from "@tabler/icons-react";
import { memo, useState } from "react";

type Props = {
    type?: "default" | "circle";
    iconsSize?: number;
    title: string;
    w: number;
    h: number;
    isInstalled: boolean;
    isParentHovered: boolean;
    link: string;
};

export const IconExecuteOverlay = memo(function IconExecuteOverlay({
    type = "default",
    iconsSize = 20,
    title,
    w,
    h,
    isInstalled,
    isParentHovered,
    link,
}: Props) {
    const isCircle = type === "circle";
    const [isHovered, setIsHovered] = useState(false);

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
                border: isHovered && isCircle
                    ? "2px solid var(--interlinked-color-secondary)" 
                    : isCircle 
                        ? "2px solid var(--interlinked-color-primary-soft)" 
                        : undefined,
                opacity: isParentHovered ? 0.9 : 0,
                transform: isParentHovered ? "scale(1)" : "scale(0.96)",
                transition: "opacity 220ms ease, transform 220ms ease",
            }}
        >
            <Box
                w={isCircle ? iconsSize * 2 : w}
                h={isCircle ? iconsSize * 2 : h}
                component="a"
                href={link}
                style={{
                    top: isCircle ? -2 : 0,
                    left: isCircle ? -2 : 0,
                    position: "relative",
                    display: "flex",
                    color: isHovered 
                        ? "var(--interlinked-color-secondary)" 
                        : "var(--interlinked-color-primary-soft)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isParentHovered ? 1 : 0,
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={(e) => e.stopPropagation()}
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