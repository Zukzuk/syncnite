import React from "react";
import { Anchor, Badge, Box, Group, Image, Stack, Text } from "@mantine/core";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { GameItem } from "../../../types/types";
import { GRID } from "../../../lib/constants";
import { getTheme } from "../../../lib/utils";

type Props = {
    item: GameItem;
    onBgHovered: (hovered: boolean) => void;
};

export function AssociatedDetails({ item, onBgHovered }: Props): JSX.Element {
    const { sortingName, tags = [], isInstalled, isHidden, links, coverUrl, bgUrl } = item;
    const isOpenDelayed = useDelayedFlag({ active: true, delayMs: 70 });
    const { isDark } = getTheme();

    return (
        <Stack
            gap={6}
            align="flex-start"
            className="subtle-scrollbar"
            pr={GRID.gap}
            pb={GRID.gap}
            style={{
                width: GRID.coverWidth + GRID.gap + 4,
                height: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehaviorY: "contain",
                opacity: isOpenDelayed ? 1 : 0,
                transform: isOpenDelayed ? "translateY(0)" : "translateY(12px)",
                willChange: "opacity, transform",
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms, 260ms",
                transitionTimingFunction: "ease, ease",
            }}
        >
            <Image
                src={coverUrl}
                alt={sortingName || "cover"}
                w={GRID.coverWidth}
                mb={4}
                radius="sm"
                fit="cover"
                loading="lazy"
                style={{
                    border: isDark
                        ? "2px solid var(--mantine-color-dark-9)"
                        : "2px solid var(--mantine-color-gray-3)",
                }}
            />

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

                {/* Tags */}
                {tags.length > 0 && (
                    <Box>
                        <Text size="xs" c="dimmed">
                            Tags
                        </Text>
                        <Group gap={6} mt={6} wrap="wrap">
                            {tags.map((t) => (
                                <Badge key={t} size="xs" variant="filled">
                                    {t}
                                </Badge>
                            ))}
                        </Group>
                    </Box>
                )}
            </Stack>

            <Image
                src={bgUrl}
                alt={sortingName || "wallpaper"}
                w={GRID.coverWidth}
                my={6}
                radius="sm"
                fit="cover"
                loading="lazy"
                style={{
                    border: isDark
                        ? "2px solid var(--mantine-color-dark-9)"
                        : "2px solid var(--mantine-color-gray-3)",
                }}
                onMouseOver={() => onBgHovered(true)}
                onMouseOut={() => onBgHovered(false)}
                onClick={(e) => e.stopPropagation()}
            />

            <Stack gap={6} align="stretch" style={{ width: "100%" }}>
                {/* Links */}
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
    );
}
