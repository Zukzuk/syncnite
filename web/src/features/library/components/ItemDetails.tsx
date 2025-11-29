import React from "react";
import { Box, Paper, Group, Text, Image, Badge, Divider, Anchor, Stack, Collapse } from "@mantine/core";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { GameItem } from "../../../types/types";

type Props = {
    item: GameItem;
    isOpen: boolean;
    onToggle?: (e: React.MouseEvent) => void;
};

export function ItemDetails({ item, isOpen, onToggle }: Props): JSX.Element {
    const { id, gameId, sortingName, source, tags, series, isInstalled, isHidden, link, year, coverUrl } = item;
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
                <Group align="flex-start" gap="md" wrap="nowrap">
                    {/* LEFT: COVER + Badges under it */}
                    <Stack gap={6} align="flex-start">
                        {coverUrl && (
                            <Image
                                src={coverUrl}
                                alt="cover"
                                w={220}
                                mb={4}
                                radius="md"
                                fit="cover"
                                loading="lazy"
                            />
                        )}

                        {/* Installed + Hidden badges under cover */}
                        <Group gap={6} wrap="wrap">
                            <Badge size="xs" color={isInstalled ? "green" : "red"} variant="filled">
                                {isInstalled ? "Installed" : "Not installed"}
                            </Badge>

                            {isHidden && (
                                <Badge size="xs" color="yellow" variant="filled">
                                    Hidden
                                </Badge>
                            )}
                        </Group>
                    </Stack>

                    {/* RIGHT: INFO */}
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Divider mb="sm" />

                        {/* IDENTITY */}
                        <Stack gap={4} mb="md">
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                                Identity
                            </Text>

                            <Group gap={6}>
                                <Text size="xs" c="dimmed" style={{ minWidth: 90 }}>
                                    Playnite Id
                                </Text>
                                <Text size="xs">{id}</Text>
                            </Group>

                            <Group gap={6}>
                                <Text size="xs" c="dimmed" style={{ minWidth: 90 }}>
                                    Game Id
                                </Text>
                                <Text size="xs">{gameId}</Text>
                            </Group>

                            {sortingName && (
                                <Group gap={6}>
                                    <Text size="xs" c="dimmed" style={{ minWidth: 90 }}>
                                        Sorting Name
                                    </Text>
                                    <Text size="xs">{sortingName}</Text>
                                </Group>
                            )}

                            {year && (
                                <Group gap={6}>
                                    <Text size="xs" c="dimmed" style={{ minWidth: 90 }}>
                                        Year
                                    </Text>
                                    <Text size="xs">{year}</Text>
                                </Group>
                            )}

                            <Group gap={6}>
                                <Text size="xs" c="dimmed" style={{ minWidth: 90 }}>
                                    Source
                                </Text>
                                <Text size="xs">{source}</Text>
                            </Group>
                        </Stack>

                        {/* TAGS */}
                        {tags.length > 0 && (
                            <Box mb="md">
                                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                                    Tags
                                </Text>
                                <Group gap={6} mt={4} wrap="wrap">
                                    {tags.map((t) => (
                                        <Badge key={t} size="xs" variant="filled">
                                            {t}
                                        </Badge>
                                    ))}
                                </Group>
                            </Box>
                        )}

                        {/* SERIES */}
                        {series.length > 0 && (
                            <Box mb="md">
                                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                                    Series
                                </Text>
                                <Group gap={6} mt={4} wrap="wrap">
                                    {series.map((s) => (
                                        <Badge key={s} size="xs" variant="filled">
                                            {s}
                                        </Badge>
                                    ))}
                                </Group>
                            </Box>
                        )}

                        {/* LINK */}
                        {link && (
                            <Box mb="md">
                                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                                    Link
                                </Text>
                                <Anchor
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    size="xs"
                                    mt={4}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {link}
                                </Anchor>
                            </Box>
                        )}
                    </Box>
                </Group>
            </Paper>
        </Collapse>
    );
}