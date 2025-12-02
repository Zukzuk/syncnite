import React from "react";
import { Box, Image, Stack, Text } from "@mantine/core";
import { GRID, MAX_ASSOCIATED } from "../../../lib/constants";
import { GameItem } from "../../../types/types";

type Props = {
    label: string;
    items: GameItem[];
    isOpen: boolean;
    onDeckClick: () => void;
};

export function ItemAssociatedStack({
    label,
    items,
    isOpen,
    onDeckClick,
}: Props): JSX.Element | null {
    if (items.length === 0) return null;

    const cards = items.filter((g) => g.coverUrl).slice(0, MAX_ASSOCIATED);
    const previewCards = cards.slice(0, 4);

    return (
        <Stack
            gap={4}
            style={{ flex: "0 0 auto", width: GRID.cardWidth }}
        >
            <Text size="xs" c="dimmed" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {label}
            </Text>

            <Box
                onClick={(e) => {
                    e.stopPropagation();
                    onDeckClick();
                }}
                style={{
                    padding: GRID.gap,
                    borderRadius: 8,
                    border: isOpen ? "1px solid var(--mantine-primary-color-4)" : "1px solid var(--mantine-color-default-border)",
                    backgroundColor: isOpen ? "var(--mantine-primary-color-light)" : "var(--mantine-color-body)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: GRID.gap,
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                }}
            >
                <Box
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 4,
                    }}
                >
                    {previewCards.map((g) => (
                        <Box
                            key={g.id}
                            style={{
                                width: "100%",
                                aspectRatio: "23 / 32",
                                borderRadius: 4,
                                overflow: "hidden",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.25)",
                            }}
                        >
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
