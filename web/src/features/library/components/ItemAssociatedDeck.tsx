import React from "react";
import { Box, Image, Stack, Text } from "@mantine/core";
import { ASSOCIATED_CARD_STEP_Y, GRID, MAX_ASSOCIATED } from "../../../lib/constants";
import { GameItem } from "../../../types/types";
import { getTheme } from "../../../lib/utils";

type Props = {
    label: string;
    items: GameItem[];
    onAssociatedClick: (targetId: string) => void;
    /** Whether this deck is the “spread/open” one */
    isOpen?: boolean;
    /** Clicking the deck itself (used to swap open/stacked) */
    onDeckClick?: () => void;
};

export function ItemAssociatedDeck({
    label,
    items,
    onAssociatedClick,
}: Props): JSX.Element | null {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const [isDeckHovered, setIsDeckHovered] = React.useState(false);
    const { isDark } = getTheme();

    const cards = items.filter((g) => g.coverUrl).slice(0, MAX_ASSOCIATED);
    if (cards.length === 0) return null;

    const cardHeight = (GRID.cardWidth * 32) / 23;

    // Split deck into at most 2 columns: first half left, second half right
    const splitIndex = Math.ceil(cards.length / 2);
    const leftCount = splitIndex;
    const rightCount = cards.length - splitIndex;

    const leftHeight =
        leftCount > 0 ? cardHeight + ASSOCIATED_CARD_STEP_Y * (leftCount - 1) : 0;
    const rightHeight =
        rightCount > 0 ? cardHeight + ASSOCIATED_CARD_STEP_Y * (rightCount - 1) : 0;

    const deckHeight = Math.max(leftHeight, rightHeight);

    // Layout: up to 2 columns wide
    const colWidth = GRID.cardWidth;
    const colGap = GRID.gap * 2;
    const hasRightColumn = rightCount > 0;
    const deckWidth = hasRightColumn ? colWidth * 2 + colGap : colWidth;

    const hoveredIndex = hoveredId ? cards.findIndex((c) => c.id === hoveredId) : -1;
    const hasHoveredCard = hoveredIndex >= 0;
    const maxZ = cards.length + 1;
    const topIndex = hasHoveredCard ? hoveredIndex : -1;

    return (
        <Stack
            gap={4}
            style={{
                flex: "0 0 auto",
            }}
        >
            <Text size="xs" c="dimmed" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {label}
            </Text>

            <Box
                className="subtle-scrollbar"
                p={GRID.gap}
                onMouseEnter={() => setIsDeckHovered(true)}
                onMouseLeave={() => {
                    setIsDeckHovered(false);
                    setHoveredId(null);
                }}
                style={{
                    flex: "1 1 auto",
                    maxHeight: `calc(100% - ${GRID.gap * 4}px)`,
                    overflowY: "scroll",
                    overflowX: "visible",
                    overscrollBehaviorY: "contain",
                }}
            >
                <Box
                    aria-label="item-associated-card"
                    style={{
                        position: "relative",
                        width: deckWidth,
                        height: deckHeight,
                        overflow: "visible",
                    }}
                >
                    {cards.map((g, index) => {
                        // Decide column + vertical offset for this card
                        const inLeftColumn = index < splitIndex;
                        const indexInColumn = inLeftColumn
                            ? index
                            : index - splitIndex;

                        const left = inLeftColumn ? 0 : colWidth + colGap;
                        const top = indexInColumn * ASSOCIATED_CARD_STEP_Y;

                        // Pyramid z-index around hovered card (same logic as before)
                        let zIndex: number;
                        if (!hasHoveredCard) {
                            zIndex = index + 1;
                        } else {
                            const distance = Math.abs(index - hoveredIndex);
                            zIndex = maxZ - distance;
                        }

                        const isTopCard = hasHoveredCard && index === topIndex;
                        const isDimmed =
                            hasHoveredCard && isDeckHovered && !isTopCard;

                        return (
                            <Box
                                key={g.id}
                                component="a"
                                title={`${g.title}${g.year ? ` (${g.year})` : ""
                                    }`}
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
                                    left,
                                    top,
                                    width: GRID.cardWidth,
                                    zIndex,
                                    cursor: "pointer",
                                    borderRadius: 4,
                                    overflow: "hidden",
                                    backgroundColor:
                                        "var(--mantine-color-dark-6)",
                                    boxShadow: isTopCard
                                        ? "0 8px 16px rgba(0, 0, 0, 0.25)"
                                        : "0 4px 8px rgba(0, 0, 0, 0.15)",
                                    border: isTopCard
                                        ? isDark
                                            ? "2px solid var(--mantine-color-dark-9)"
                                            : "2px solid var(--mantine-color-gray-2)"
                                        : "none",
                                    transform: isTopCard ? "scale(1.05)" : "scale(1)",
                                    transition:
                                        "transform 140ms ease, box-shadow 140ms ease",
                                }}
                            >
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

                                    {isDimmed && (
                                        <Box
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                backgroundColor: isDark
                                                    ? "color-mix(in srgb, var(--mantine-color-dark-7) 60%, transparent)"
                                                    : "color-mix(in srgb, var(--mantine-color-gray-3) 50%, transparent)",
                                                transition:
                                                    "background-color 120ms ease",
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Stack>
    );
}
