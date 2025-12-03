import React from "react";
import { Box, Image, Stack, Text } from "@mantine/core";
import { GRID, MAX_ASSOCIATED } from "../../../lib/constants";
import { GameItem } from "../../../types/types";
import { getTheme } from "../../../lib/utils";

type Props = {
    label: string;
    items: GameItem[];
    isOpen: boolean;
    onDeckClick: () => void;
};

export function AssociatedStack({
    label,
    items,
    isOpen,
    onDeckClick,
}: Props): JSX.Element | null {
    if (items.length === 0) return null;
    const [isHovered, setIsHovered] = React.useState(false);
    const isHoveredOrOpen = isHovered || isOpen;

    const { isDark } = getTheme();

    const cards = items.filter((g) => g.coverUrl).slice(0, MAX_ASSOCIATED);
    const previewCards = cards.slice(0, 4);
    const previewSlots = Array.from({ length: 4 }, (_, i) => previewCards[i] ?? null);

    return (
        <Stack
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
                    onDeckClick();
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
