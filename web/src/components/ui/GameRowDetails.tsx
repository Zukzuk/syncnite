import React from "react";
import { Group, Image, Paper, AspectRatio, Box } from "@mantine/core";
import { ANIM } from "../../lib/constants";

type Props = {
    title: string;
    coverUrl: string | null;
    bgOn: boolean;
    everOpened: boolean;
    onInnerClick?: (e: React.MouseEvent) => void;
};

export function GameRowDetails({ title, coverUrl, bgOn, everOpened, onInnerClick }: Props) {
    return (
        <Paper
            pl="md" pt="md" pr={6} pb={0}
            ml={0} mt={0} mr={48} mb="lg"
            onClick={(e) => {
                e.stopPropagation();
                onInnerClick?.(e);
            }}
            style={{
                backgroundColor: "transparent",
                opacity: bgOn ? 1 : 0,
                transform: bgOn ? "translateY(0)" : "translateY(6px)",
                willChange: "opacity, transform",
                transitionProperty: "opacity, transform",
                transitionDuration: "200ms, 260ms",
                transitionTimingFunction: "ease, ease",
                transitionDelay: bgOn ? `${ANIM.collapseContentDelayMs}ms, ${ANIM.collapseContentDelayMs}ms` : "0ms, 0ms",
            }}
        >
            <Group align="start" gap="md" wrap="nowrap" pb={0}>
                {everOpened && coverUrl ? (
                    <Image
                        src={coverUrl}
                        alt={`${title} cover`}
                        w={220}
                        mb="md"
                        radius="md"
                        fit="cover"
                        loading="lazy"
                    />
                ) : null}

                {/* reserved preview slot */}
                <AspectRatio ratio={16 / 9} w="100%">
                    <Box />
                </AspectRatio>
            </Group>
        </Paper>
    );
}
