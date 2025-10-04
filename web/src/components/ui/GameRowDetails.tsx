import React from "react";
import { Group, Image, Paper, AspectRatio, Box } from "@mantine/core";

type Props = {
    title: string;
    coverUrl: string | null;
    collapseOpenDelayed: boolean;
    everOpened: boolean;
    onToggle?: (e: React.MouseEvent) => void;
};

export function GameRowDetails({ title, coverUrl, collapseOpenDelayed, everOpened, onToggle }: Props) {
    return (
        <Paper
            pl={0} pt="md" pr={6} pb={0}
            ml={0} mt={0} mr={48} mb="lg"
            onClick={(e) => {
                e.stopPropagation();
                onToggle?.(e);
            }}
            style={{
                backgroundColor: "transparent",
                opacity: collapseOpenDelayed ? 1 : 0,
                transform: collapseOpenDelayed ? "translateY(0)" : "translateY(12px)",
                willChange: "opacity, transform",
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms, 260ms",
                transitionTimingFunction: "ease, ease",
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
