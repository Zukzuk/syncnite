import React from "react";
import { Collapse, Group, Image, Paper } from "@mantine/core";
import { useDelayedFlag } from "../hooks/useDelayedFlag";

type Props = {
    title: string;
    coverUrl: string | null;
    isOpen: boolean;
    onToggle?: (e: React.MouseEvent) => void;
};

export function ItemDetails({ title, coverUrl, isOpen, onToggle }: Props): JSX.Element {
    const isOpenDelayed = useDelayedFlag({ active: isOpen, delayMs: 140 });

    return (
        <Collapse in={isOpen} transitionDuration={140}>
            <Paper
                pl={0} pt="md" pr={6} pb={0}
                ml={0} mt={0} mr={48} mb="lg"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle?.(e);
                }}
                style={{
                    backgroundColor: "transparent",
                    opacity: isOpenDelayed ? 1 : 0,
                    transform: isOpenDelayed ? "translateY(0)" : "translateY(12px)",
                    willChange: "opacity, transform",
                    transitionProperty: "opacity, transform",
                    transitionDuration: "220ms, 260ms",
                    transitionTimingFunction: "ease, ease",
                }}
            >
                <Group align="start" gap="md" wrap="nowrap" pb={0}>
                    {coverUrl ? (
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
                </Group>
            </Paper>
        </Collapse>
    );
}
