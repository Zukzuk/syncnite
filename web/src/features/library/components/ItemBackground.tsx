
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
                opacity: wallpaperBg ? 1 : isOpenDelayed ? (isDark ? 0.1 : 0.3) : 0,
                willChange: "opacity, transform",
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms, 260ms",
                transitionTimingFunction: "ease, ease",
            }}
        />
    );
}

