import React from "react";
import { Group, Stack, Paper, Text, Collapse, Center } from "@mantine/core";
import { Deck, GameItem } from "../../../types/types";
import { GRID } from "../../../lib/constants";
import { AssociatedDeck } from "./AssociatedDeck";
import { AssociatedStacks } from "./AssociatedStacks";
import { AssociatedDetails } from "./AssociatedDetails";

type Props = {
    item: GameItem;
    isOpen: boolean;
    relatedBySeries?: GameItem[];
    relatedByTags?: GameItem[];
    relatedByYear?: GameItem[];
    onToggleItem: () => void;
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

    // Year deck
    const hasYearDeck = !!relatedByYear && relatedByYear.length > 0;
    const yearDeck: Deck | null = hasYearDeck
        ? {
            key: "year",
            label: item.year ? `Year ${String(item.year)}` : "Year",
            items: relatedByYear!,
        }
        : null;

    // Combine all decks
    const allDecks: Deck[] = [
        ...seriesDecks,
        ...tagDecks,
        ...(yearDeck ? [yearDeck] : []),
    ];

    // State to track which deck is open
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

    if (allDecks.length === 0) {
        return (
            <Collapse
                in={isOpen}
                transitionDuration={140}
                py={GRID.gap}
                pr={GRID.gap * 6}
                style={{ height: `calc(100% - ${GRID.rowHeight}px)` }}
            >
                <Paper
                    p={0}
                    m={0}
                    radius={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleItem();
                    }}
                    style={{
                        backgroundColor: "transparent",
                        height: "100%",
                        overflowX: "auto",
                        overflowY: "hidden",
                    }}
                >
                    <Stack style={{ height: "100%", minHeight: 0 }}>
                        <Center>
                            <Text>No associated items found.</Text>
                        </Center>
                    </Stack>
                </Paper>
            </Collapse>
        )
    }

    return (
        <Collapse
            in={isOpen}
            transitionDuration={140}
            py={GRID.gap}
            pr={GRID.gap * 6}
            style={{ height: `calc(100% - ${GRID.rowHeight}px)` }}
        >
            <Paper
                p={0}
                m={0}
                radius={0}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleItem();
                }}
                style={{
                    backgroundColor: "transparent",
                    height: "100%",
                    overflowX: "auto",
                    overflowY: "hidden",
                }}
            >
                <Group
                    align="flex-start"
                    gap={GRID.gap * 3}
                    wrap="nowrap"
                    h="100%"
                >
                    <AssociatedDetails
                        aria-label="item-associated-details"
                        item={item}
                    />

                    <AssociatedDeck
                        aria-label="item-associated-deck"
                        {...openDeck}
                        currentItemId={item.id}
                        onAssociatedClick={onAssociatedClick}
                    />

                    <AssociatedStacks
                        aria-label="item-associated-stacks"
                        allDecks={allDecks}
                        openDeckKey={openDeck.key}
                        onDeckClick={setOpenDeckKey}
                    />
                </Group>
            </Paper>
        </Collapse>
    );
}