import React from "react";
import {
    Box,
    Paper,
    Group,
    Text,
    Image,
    Badge,
    Stack,
    Collapse,
    Anchor,
} from "@mantine/core";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { GameItem } from "../../../types/types";

type Props = {
    item: GameItem;
    isOpen: boolean;
    onToggleItem?: (e: React.MouseEvent) => void;
};

const COVER_WIDTH = 220;

export function ItemDetails({ item, isOpen, onToggleItem }: Props): JSX.Element {
    const {
        sortingName,
        tags,
        series,
        isInstalled,
        isHidden,
        links,
        coverUrl,
    } = item;
    const isOpenDelayed = useDelayedFlag({ active: isOpen, delayMs: 140 });

    return (
        <Collapse in={isOpen} transitionDuration={140}>
            <Paper
                pl={0}
                pt="md"
                pr={6}
                pb={0}
                ml={0}
                mt={0}
                mr={48}
                mb="lg"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleItem?.(e);
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
                <Group align="flex-start" gap="md" wrap="nowrap">
                    {/* LEFT: COVER + meta under it (fixed width) */}
                    <Stack
                        gap={6}
                        align="flex-start"
                        style={{ width: COVER_WIDTH, maxWidth: COVER_WIDTH }}
                    >
                        {coverUrl && (
                            <Image
                                src={coverUrl}
                                alt="cover"
                                w={COVER_WIDTH}
                                mb={4}
                                radius="md"
                                fit="cover"
                                loading="lazy"
                            />
                        )}

                        <Stack gap={6} align="stretch" style={{ width: "100%" }}>
                            {/* Installed + Hidden badges */}
                            <Group gap={6} wrap="wrap">
                                <Badge
                                    size="xs"
                                    color={isInstalled ? "green" : "gray"}
                                    variant="filled"
                                >
                                    {isInstalled ? "Installed" : "Not installed"}
                                </Badge>

                                {isHidden && (
                                    <Badge size="xs" color="yellow" variant="filled">
                                        Hidden
                                    </Badge>
                                )}
                            </Group>

                            {/* TAGS – badges wrap */}
                            {tags.length > 0 && (
                                <Box>
                                    <Text size="xs" c="dimmed">
                                        Tags
                                    </Text>
                                    <Group gap={6} mt={2} wrap="wrap">
                                        {tags.map((t) => (
                                            <Badge key={t} size="xs" variant="filled">
                                                {t}
                                            </Badge>
                                        ))}
                                    </Group>
                                </Box>
                            )}

                            {/* Raw links array */}
                            {Array.isArray(links) && links.length > 0 && (
                                <Box>
                                    <Text size="xs" c="dimmed">
                                        Links
                                    </Text>
                                    <Stack gap={2} mt={2} style={{ width: "100%" }}>
                                        {links
                                            .filter((l) => l?.Url)
                                            .map((l, idx) => (
                                                <Anchor
                                                    key={`${l.Url}-${idx}`}
                                                    href={l.Url!}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    size="xs"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title={l.Url!}
                                                    style={{
                                                        display: "block",
                                                        maxWidth: "100%",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {l.Url}
                                                </Anchor>
                                            ))}
                                    </Stack>
                                </Box>
                            )}
                        </Stack>
                    </Stack>

                    {/* RIGHT: currently empty, kept for layout / future use */}
                    <Box style={{ flex: 1, minWidth: 0 }} />
                </Group>
            </Paper>
        </Collapse>
    );
}
