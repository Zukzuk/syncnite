import React from "react";
import { Box, Image, Stack, Text } from "@mantine/core";
import { GRID, MAX_ASSOCIATED } from "../../../lib/constants";
import { AssociatedDeckMeta } from "../../../types/types";
import { getTheme } from "../../../lib/utils";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";

function StackCard({ deck, isOpen, onClick }: { deck: AssociatedDeckMeta; isOpen: boolean; onClick: () => void }): JSX.Element | null {
    const { label, items } = deck;
    const [isHovered, setIsHovered] = React.useState(false);
    const { isDark } = getTheme();

    if (!items.length) return null;

    const cards = items.filter((g) => g.coverUrl).slice(0, MAX_ASSOCIATED);
    const previewCards = cards.slice(0, 4);
    const previewSlots = Array.from(
        { length: 4 },
        (_, i) => previewCards[i] ?? null
    );

    const isHoveredOrOpen = isHovered || isOpen;

    return (
        <Stack
            aria-label="associated-stack"
            gap={4}
            bg="var(--mantine-color-body)"
            style={{
                flex: "0 0 auto",
                width: GRID.cardWidth,
                borderRadius: 4,
            }}
        >
            <Box
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
                style={{
                    padding: GRID.gap,
                    borderRadius: 4,
                    border: isHoveredOrOpen
                        ? "2px solid var(--mantine-primary-color-4)"
                        : isDark
                            ? "2px solid var(--mantine-color-dark-9)"
                            : "2px solid var(--mantine-color-gray-3)",
                    backgroundColor: isOpen
                        ? "var(--mantine-primary-color-light)"
                        : "var(--mantine-color-body)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: GRID.gap,
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                }}
            >
                <Text
                    size="xs"
                    c="dimmed"
                    style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </Text>

                <Box
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 4,
                    }}
                >
                    {previewSlots.map((g, idx) => (
                        <Box
                            key={g ? g.id : `placeholder-${idx}`}
                            style={{
                                width: "100%",
                                aspectRatio: "23 / 32",
                                borderRadius: 4,
                                overflow: "hidden",
                                boxShadow: g
                                    ? "0 2px 4px rgba(0, 0, 0, 0.25)"
                                    : "inset 0 0 0 1px rgba(0, 0, 0, 0.1)",
                                backgroundColor: "transparent",
                            }}
                        >
                            {g && (
                                <Image
                                    src={g.coverUrl || ""}
                                    alt={g.title}
                                    fit="cover"
                                    loading="lazy"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                            )}
                        </Box>
                    ))}
                </Box>

                <Text size="xs" c="dimmed">
                    {cards.length} games
                </Text>
            </Box>
        </Stack>
    );
}

type Props = {
    allDecks: AssociatedDeckMeta[];
    openDeckKey: string | null;
    columns: number;
    onDeckClick: (key: string) => void;
};

export function AssociatedStacks({
    allDecks,
    openDeckKey,
    columns,
    onDeckClick,
}: Props): JSX.Element | null {
    const isOpenDelayed = useDelayedFlag({ active: true, delayMs: 210 });

    if (!allDecks.length || columns <= 0) return null;

    return (
        <Box
            className="subtle-scrollbar"
            pl={4}
            style={{
                flex: 1,
                minWidth: 0,
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
            <Box
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, ${GRID.cardWidth}px)`,
                    gap: GRID.gap,
                    justifyContent: "flex-start",
                    alignContent: "flex-start",
                }}
            >
                {allDecks.map((deck) => (
                    <StackCard
                        key={deck.key}
                        deck={deck}
                        isOpen={openDeckKey === deck.key}
                        onClick={() => onDeckClick(deck.key)}
                    />
                ))}
            </Box>
        </Box>
    );
}
