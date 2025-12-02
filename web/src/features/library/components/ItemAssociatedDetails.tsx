import React from "react";
import { Box } from "@mantine/core";
import { GameItem } from "../../../types/types";
import { GRID } from "../../../lib/constants";
import { ItemAssociatedStack } from "./ItemAssociatedStack";
import { ItemAssociatedDeck } from "./ItemAssociatedDeck";

type Props = {
    item: GameItem;
    bySeries?: GameItem[];
    byTags?: GameItem[];
    byYear?: GameItem[];
    onAssociatedClick: (targetId: string) => void;
};

type Deck = {
    key: string;
    label: string;
    items: GameItem[];
};

export function ItemAssociatedDetails({
    item,
    bySeries,
    byTags,
    byYear,
    onAssociatedClick,
}: Props): JSX.Element | null {
    const seriesNames = item.series ?? [];
    const tagNames = item.tags ?? [];

    // One deck per series
    const seriesDecks: Deck[] = seriesNames
        .map((name) => ({
            key: `series-${name}`,
            label: name,
            items: (bySeries ?? []).filter((g) => g.series?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 0);

    // One deck per tag
    const tagDecks: Deck[] = tagNames
        .map((name) => ({
            key: `tag-${name}`,
            label: name,
            items: (byTags ?? []).filter((g) => g.tags?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 0);

    const hasYearDeck = !!byYear && byYear.length > 0;
    const yearDeck: Deck | null = hasYearDeck
        ? {
            key: "year",
            label: item.year ? String(item.year) : "Year",
            items: byYear!,
        }
        : null;

    const allDecks: Deck[] = [
        ...seriesDecks,
        ...tagDecks,
        ...(yearDeck ? [yearDeck] : []),
    ];

    if (allDecks.length === 0) return null;

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
        <Box
            className="subtle-scrollbar"
            style={{
                minHeight: "100%",
                width: "100%",
                overflowX: "hidden",
                overflowY: "auto",
            }}
        >
            <Box
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "stretch",
                    gap: GRID.gap * 3,
                    height: "100%",
                    width: "100%",
                }}
            >
                {/* LEFT: OPEN / SPREAD DECK – fixed column */}
                <ItemAssociatedDeck
                    aria-label="item-associated-deck"
                    key={openDeck.key}
                    label={openDeck.label}
                    items={openDeck.items}
                    onAssociatedClick={onAssociatedClick}
                />

                {/* RIGHT: STACKED DECKS – grid of stacks */}
                <Box
                    style={{
                        flex: 1,
                        display: "grid",
                        gridTemplateColumns: `repeat(auto-fill, ${GRID.cardWidth}px)`,
                        gap: GRID.gap * 3,
                        justifyContent: "flex-start",
                        alignContent: "flex-start",
                    }}
                >
                    {allDecks.map((deck) => (
                        <ItemAssociatedStack
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
        </Box>
    );
}
