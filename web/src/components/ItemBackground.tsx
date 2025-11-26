
import React from "react";
import { Box } from "@mantine/core";
import { useDelayedFlag } from "../features/library/hooks/useDelayedFlag";
import { Z_INDEX } from "../lib/constants";

type Props = {
    bgUrl: string | null;
    isOpen: boolean;
};

export function ItemBackground({ bgUrl, isOpen }: Props) {
    const isOpenDelayed = useDelayedFlag({ active: isOpen, delayMs: 140 });

    if (!isOpen || !bgUrl)  return null;

    return (
        <Box
            aria-hidden
            style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${bgUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                pointerEvents: "none",
                zIndex: Z_INDEX.belowBase,
                transform: isOpenDelayed ? "scale(1.02)" : "scale(1.01)",
                opacity: isOpenDelayed ? 0.3 : 0,
                willChange: "opacity, transform",
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms, 260ms",
                transitionTimingFunction: "ease, ease",
            }}
        />
    );
}

