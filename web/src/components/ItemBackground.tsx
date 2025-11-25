
import React from "react";
import { Box } from "@mantine/core";
import { useDelayedFlag } from "../features/library/hooks/useDelayedFlag";

type Props = {
    bgUrl: string | null;
    collapseOpen: boolean;
    everOpened: boolean;
};

export function ItemBackground({ bgUrl, collapseOpen, everOpened }: Props) {
    const collapseOpenDelayed = useDelayedFlag({ active: collapseOpen, delayMs: 140 });

    if (!collapseOpen && !everOpened || !bgUrl) {
        return null;
    }

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
                zIndex: 0,
                transform: collapseOpenDelayed ? "scale(1.02)" : "scale(1.01)",
                opacity: collapseOpenDelayed ? 0.3 : 0,
                willChange: "opacity, transform",
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms, 260ms",
                transitionTimingFunction: "ease, ease",
            }}
        />
    );
}

