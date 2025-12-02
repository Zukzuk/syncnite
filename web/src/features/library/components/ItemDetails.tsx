import React from "react";
import { Box, Group, Stack, Paper, Image, Text, Badge, Anchor, Collapse } from "@mantine/core";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { GameItem } from "../../../types/types";
import { GRID } from "../../../lib/constants";
import { ItemAssociatedDecks } from "./ItemAssociatedDeck";

type Props = {
    item: GameItem;
    isOpen: boolean;
    relatedBySeries?: GameItem[];
    relatedByTags?: GameItem[];
    relatedByYear?: GameItem[];
    onToggleItem: (e: React.MouseEvent) => void;
    onAssociatedClick: (targetId: string) => void;
};

export function ItemDetails({
    item,
    isOpen,
    relatedBySeries,
    relatedByTags,
    relatedByYear,
    onToggleItem,
    onAssociatedClick,
}: Props): JSX.Element {
    const { sortingName, tags, isInstalled, isHidden, links, coverUrl } = item;
    const isOpenDelayed = useDelayedFlag({ active: isOpen, delayMs: 140 });

    return (
        <Collapse
            in={isOpen}
            transitionDuration={140}
            py={GRID.gap}
            pr={GRID.gap * 6}
            style={{
                height: `calc(100% - ${GRID.rowHeight}px)`
            }}
        >
            <Paper
                p={0}
                m={0}
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
                    height: "100%",
                }}
            >
                <Group
                    align="flex-start"
                    gap={GRID.gap * 3}
                    wrap="nowrap"
                    style={{ height: "100%" }}
                >
                    {/* LEFT: COVER + meta under it (fixed width) */}
                    <Stack
                        gap={6}
                        align="flex-start"
                        style={{ 
                            width: GRID.coverWidth,
                            overflowY: "auto",
                            overflowX: "hidden",
                         }}
                    >
                        {coverUrl && (
                            <Image
                                src={coverUrl}
                                alt={sortingName || "cover"}
                                w={GRID.coverWidth}
                                mb={4}
                                radius="sm"
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

                    {/* RIGHT: associated decks – horizontally scrollable, each deck scrolls vertically */}
                    <Box
                        style={{
                            flex: 1,
                            minWidth: 0,
                            height: "100%",
                            display: "flex",
                        }}
                    >
                        <ItemAssociatedDecks
                            aria-label="item-associated-decks" 
                            item={item}
                            bySeries={relatedBySeries}
                            byTags={relatedByTags}
                            byYear={relatedByYear}
                            onAssociatedClick={onAssociatedClick}
                        />
                    </Box>
                </Group>
            </Paper>
        </Collapse>
    );
}