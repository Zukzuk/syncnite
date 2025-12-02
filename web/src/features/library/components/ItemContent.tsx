import React from "react";
import { Box, Group, Stack, Paper, Image, Text, Badge, Anchor, Collapse } from "@mantine/core";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { Deck, GameItem } from "../../../types/types";
import { GRID } from "../../../lib/constants";
import { AssociatedDeck } from "./AssociatedDeck";
import { AssociatedStack } from "./AssociatedStack";

type Props = {
    item: GameItem;
    isOpen: boolean;
    relatedBySeries?: GameItem[];
    relatedByTags?: GameItem[];
    relatedByYear?: GameItem[];
    onToggleItem: (e: React.MouseEvent) => void;
    onAssociatedClick: (targetId: string) => void;
};

export function ItemContent({
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

    const seriesNames = item.series ?? [];
    const tagNames = item.tags ?? [];

    // One deck per series
    const seriesDecks: Deck[] = seriesNames
        .map((name) => ({
            key: `series-${name}`,
            label: name,
            items: (relatedBySeries ?? []).filter((g) => g.series?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 0);

    // One deck per tag
    const tagDecks: Deck[] = tagNames
        .map((name) => ({
            key: `tag-${name}`,
            label: name,
            items: (relatedByTags ?? []).filter((g) => g.tags?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 0);

    const hasYearDeck = !!relatedByYear && relatedByYear.length > 0;
    const yearDeck: Deck | null = hasYearDeck
        ? {
            key: "year",
            label: item.year ? `Year ${String(item.year)}` : "Year",
            items: relatedByYear!,
        }
        : null;

    const allDecks: Deck[] = [
        ...seriesDecks,
        ...tagDecks,
        ...(yearDeck ? [yearDeck] : []),
    ];

    const [openDeckKey, setOpenDeckKey] = React.useState<string | null>(null);

    // Reset when the main item changes (new game opened)
    React.useEffect(() => {
        setOpenDeckKey(null);
    }, [item.id]);

    // Determine which deck is open
    let openDeck = allDecks[0];
    if (openDeckKey) {
        const found = allDecks.find((d) => d.key === openDeckKey);
        if (found) openDeck = found;
    }

    return (
        <Collapse
            in={isOpen}
            transitionDuration={140}
            py={GRID.gap}
            pr={GRID.gap * 6}
            style={{
                height: `calc(100% - ${GRID.rowHeight}px)`,
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
                    overflow: "hidden",
                }}
            >
                <Group
                    align="flex-start"
                    gap={GRID.gap * 3}
                    wrap="nowrap"
                    style={{ height: "100%" }}
                >
                    {/* cover + meta */}
                    <Stack
                        gap={6}
                        align="flex-start"
                        className="subtle-scrollbar"
                        style={{
                            width: GRID.coverWidth,
                            height: "100%",
                            overflowY: "auto",
                            overflowX: "hidden",
                            overscrollBehaviorY: "contain",
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

                            {/* TAGS */}
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

                            {/* LINKS */}
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

                    {/* DECK */}
                    <Box
                        style={{
                            flex: "0 0 auto",
                            height: "100%",
                            display: "flex",
                            alignItems: "stretch",
                            overflow: "hidden",
                        }}
                    >
                        {allDecks.length > 0 && (
                            <AssociatedDeck
                                aria-label="item-associated-deck"
                                key={openDeck.key}
                                label={openDeck.label}
                                items={openDeck.items}
                                onAssociatedClick={onAssociatedClick}
                            />
                        )}
                    </Box>

                    {/* STACKS grid */}
                    <Box
                        className="subtle-scrollbar"
                        style={{
                            flex: 1,
                            minWidth: 0,
                            height: "100%",
                            overflowY: "auto",
                            overflowX: "hidden",
                            overscrollBehaviorY: "contain",
                        }}
                    >
                        <Box
                            style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(auto-fill, ${GRID.cardWidth}px)`,
                                gap: GRID.gap, 
                                justifyContent: "flex-start",
                                alignContent: "flex-start",
                            }}
                        >
                            {allDecks.map((deck) => (
                                <AssociatedStack
                                    aria-label="item-associated-stack"
                                    key={deck.key}
                                    label={deck.label}
                                    items={deck.items}
                                    isOpen={deck.key === openDeck.key}
                                    onDeckClick={() => setOpenDeckKey(deck.key)}
                                />
                            ))}
                        </Box>
                    </Box>

                </Group>
            </Paper>
        </Collapse>
    );
}