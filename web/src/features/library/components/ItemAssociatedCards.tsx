import React from "react";
import { Box, Flex, Image, Text } from "@mantine/core";
import { ASSOCIATED_CARD_STEP_Y, GRID, MAX_ASSOCIATED } from "../../../lib/constants";
import { GameItem } from "../../../types/types";
import { getTheme } from "../../../lib/utils";

type Props = {
    label: string;
    items: GameItem[];
    onAssociatedClick: (targetId: string) => void;
};

export function ItemAssociatedCards({ label, items, onAssociatedClick }: Props): JSX.Element | null {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const [isDeckHovered, setIsDeckHovered] = React.useState(false);
    const { isDark } = getTheme();

    const cards = items.filter((g) => g.coverUrl).slice(0, MAX_ASSOCIATED);
    if (cards.length === 0) return null;

    const cardHeight = (GRID.cardWidth * 32) / 23;
    const deckHeight = cardHeight + ASSOCIATED_CARD_STEP_Y * (cards.length - 1);
    const hoveredIndex = hoveredId ? cards.findIndex((c) => c.id === hoveredId) : -1;
    const hasHoveredCard = hoveredIndex >= 0;
    const maxZ = cards.length + 1;
    const topIndex = hasHoveredCard ? hoveredIndex : -1;

    return (
        <Flex direction="column">
            <Box h={GRID.halfRowHeight}>
                <Text size="xs" c="dimmed" pl={3}>{label}</Text>
            </Box>
            <Box
                className="subtle-scrollbar"
                p={6}
                onMouseEnter={() => setIsDeckHovered(true)}
                onMouseLeave={() => setIsDeckHovered(false)}
                style={{
                    flex: "0 0 auto",
                    maxHeight: `calc(100% - ${GRID.halfRowHeight + GRID.gap}px)`,
                    overflowY: "auto",
                    overflowX: "visible",
                    overscrollBehaviorY: "contain",
                }}
            >
                <Box
                    aria-label="item-associated-card"
                    style={{
                        position: "relative",
                        width: GRID.cardWidth,
                        height: deckHeight,
                        overflow: "visible",
                    }}
                >
                    {cards.map((g, index) => {                        
                        let zIndex: number;
                        if (!hasHoveredCard) {
                            zIndex = index + 1;
                        } else {
                            const distance = Math.abs(index - hoveredIndex);
                            zIndex = maxZ - distance;
                        }

                        const top = index * ASSOCIATED_CARD_STEP_Y;
                        const isTopCard = hasHoveredCard && index === topIndex;
                        const isDimmed = hasHoveredCard && isDeckHovered && !isTopCard;

                        return (
                            <Box
                                key={g.id}
                                component="a"
                                title={`${g.title}${g.year ? ` (${g.year})` : ""}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onAssociatedClick(g.id);
                                }}
                                onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    setHoveredId(g.id);
                                }}
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top,
                                    width: GRID.cardWidth,
                                    zIndex,
                                    cursor: "pointer",
                                    borderRadius: 4,
                                    overflow: "hidden",
                                    backgroundColor: "var(--mantine-color-dark-6)",
                                    boxShadow: isTopCard
                                        ? "0 8px 16px rgba(0, 0, 0, 0.25)"
                                        : "0 4px 8px rgba(0, 0, 0, 0.15)",
                                    border: isTopCard
                                        ? isDark
                                            ? "2px solid var(--mantine-color-dark-9)"
                                            : "2px solid var(--mantine-color-gray-2)"
                                        : "none",
                                    transform: isTopCard ? "scale(1.05)" : "scale(1)",
                                    transition: "transform 140ms ease, box-shadow 140ms ease",
                                }}
                            >
                                {/* IMAGE */}
                                <Box
                                    style={{
                                        position: "relative",
                                        width: "100%",
                                        aspectRatio: "23 / 32",
                                    }}
                                >
                                    <Image
                                        src={g.coverUrl || ""}
                                        alt={g.title}
                                        fit="fill"
                                        loading="lazy"
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "fill",
                                        }}
                                    />

                                    {/* DIMMING OVERLAY */}
                                    {isDimmed && (
                                        <Box
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                backgroundColor: isDark
                                                    ? "color-mix(in srgb, var(--mantine-color-dark-7) 65%, transparent)"
                                                    : "color-mix(in srgb, var(--mantine-color-gray-3) 50%, transparent)",
                                                transition: "background-color 120ms ease",
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Flex>
    );
}
