
import { Box } from "@mantine/core";
import { InterLinkedGameItem, InterLinkedGrid } from "../../../../types/interlinked";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";

type Props = {
    item: Pick<InterLinkedGameItem, "bgUrl">;
    isOpen: boolean;
    isDark: boolean;
    grid: InterLinkedGrid;
    wallpaperBg: boolean;
};

// Background component for a library item.
export function ItemBackground({ item, isOpen, wallpaperBg, grid, isDark }: Props): JSX.Element | null {
    const { bgUrl } = item;
    if (!isOpen || !bgUrl) return null;

    const isOpenDelayed = useDelayedFlag({ active: isOpen, delayMs: 70 });

    return (
        <Box
            aria-label="item-background"
            style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${bgUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                pointerEvents: "none",
                zIndex: grid.z.belowBase,
                transform: isOpenDelayed ? "scale(1.02)" : "scale(1)",
                opacity: wallpaperBg
                    ? 1
                    : isOpenDelayed
                        ? (isDark ? 0.03 : 0.07)
                        : 0,
                filter: wallpaperBg
                    ? "grayscale(0%)"
                    : "grayscale(100%) contrast(300%) brightness(200%)",
                willChange: "opacity, transform, filter",
                transitionProperty: "opacity, transform, filter",
                transitionDuration: "220ms, 260ms, 220ms",
                transitionTimingFunction: "ease, ease, ease",
            }}
        />

    );
}

