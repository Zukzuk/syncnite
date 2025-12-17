
import { Box } from "@mantine/core";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { Z_INDEX } from "../../../lib/constants";
import { GameItem } from "../../../types/types";
import { getTheme } from "../../../theme";

type Props = {
    item: Pick<GameItem, "bgUrl">;
    isOpen: boolean;
    wallpaperBg: boolean;
};

// Background component for a library item.
export function ItemBackground({ item, isOpen, wallpaperBg }: Props): JSX.Element | null {
    const { bgUrl } = item;
    const isOpenDelayed = useDelayedFlag({ active: isOpen, delayMs: 70 });
    const { isDark } = getTheme();

    if (!isOpen || !bgUrl) return null;

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
                zIndex: Z_INDEX.belowBase,
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

