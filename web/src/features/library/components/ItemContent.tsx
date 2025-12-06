import React from "react";
import { Group, Stack, Text, Collapse, Center, Box } from "@mantine/core";
import { AssociatedLayout, AssociatedDeckMeta, GameItem } from "../../../types/types";
import {
    GRID,
    ASSOCIATED_CARD_STEP_Y,
    MAX_ASSOCIATED,
} from "../../../lib/constants";
import { AssociatedDeck } from "./AssociatedDeck";
import { AssociatedStacks } from "./AssociatedStacks";
import { AssociatedDetails } from "./AssociatedDetails";

function computeLayout(
    width: number,
    height: number,
    totalCards: number
): AssociatedLayout {
    const MIN_STACK_COLUMNS = 1;

    if (width <= 0 || height <= 0 || totalCards === 0) {
        return {
            deckColumns: 0,
            stackColumns: Math.max(
                1,
                Math.floor(width / GRID.cardWidth)
            ),
            maxCardsPerDeckColumn: null,
            minStackColumns: MIN_STACK_COLUMNS,
        };
    }

    const deckColWidth = GRID.cardWidth + GRID.gap * 2;
    const stackColWidth = GRID.cardWidth + GRID.gap;

    const cardHeight = (GRID.cardWidth * 32) / 23;
    const stepY = ASSOCIATED_CARD_STEP_Y;

    // how many cards fit vertically in one deck column
    const maxCardsPerColumnByHeight = Math.max(
        1,
        Math.floor((height - cardHeight) / stepY) + 1
    );

    // minimal deck columns needed for all cards without vertical overflow
    const visibleCards = Math.min(MAX_ASSOCIATED, totalCards);
    const neededColsByHeight = Math.max(
        1,
        Math.ceil(visibleCards / maxCardsPerColumnByHeight)
    );

    // decks: how many columns we *can* afford while keeping at least 1 stacks column
    let maxDeckColsByWidth = 0;
    for (let cols = 1; cols <= neededColsByHeight; cols++) {
        const usedWidthForDeck = cols * deckColWidth;
        const remainingWidth = width - usedWidthForDeck;
        if (remainingWidth < stackColWidth * MIN_STACK_COLUMNS) {
            break;
        }
        maxDeckColsByWidth = cols;
    }

    // even 1 deck + 1 stack doesn’t really fit: fallback, deck scrolls
    if (maxDeckColsByWidth === 0) {
        const deckColumns = 1;
        const remainingWidth = width - deckColumns * deckColWidth;
        const stackColumns =
            remainingWidth >= stackColWidth
                ? Math.max(
                    MIN_STACK_COLUMNS,
                    Math.floor(remainingWidth / stackColWidth)
                )
                : 0;

        return {
            deckColumns,
            stackColumns,
            maxCardsPerDeckColumn: null,
            minStackColumns: MIN_STACK_COLUMNS,
        };
    }

    const deckColumns = Math.min(neededColsByHeight, maxDeckColsByWidth);
    const hitWidthLimit = deckColumns < neededColsByHeight;

    const usedWidthForDeck = deckColumns * deckColWidth;
    const remainingWidth = width - usedWidthForDeck;
    const maxStackColsByWidth =
        remainingWidth > 0 ? Math.floor(remainingWidth / stackColWidth) : 0;

    let stackColumns: number;

    if (maxStackColsByWidth <= 0) {
        stackColumns = 0;
    } else if (hitWidthLimit) {
        // decks *wanted* more columns but can’t because of width
        // → stacks at most deckColumns
        stackColumns = Math.max(
            MIN_STACK_COLUMNS,
            Math.min(deckColumns, maxStackColsByWidth)
        );
    } else {
        // decks have all columns they need by height
        // → stacks can expand to the right, bounded only by width
        stackColumns = Math.max(MIN_STACK_COLUMNS, maxStackColsByWidth);
    }

    return {
        deckColumns,
        stackColumns,
        maxCardsPerDeckColumn: hitWidthLimit ? null : maxCardsPerColumnByHeight,
        minStackColumns: MIN_STACK_COLUMNS,
    };
}

type Props = {
    item: GameItem;
    isOpen: boolean;
    openWidth: string;
    openHeight: string;
    associatedBySeries: GameItem[];
    associatedByTags: GameItem[];
    associatedByYear: GameItem[];
    associatedByInstalled: GameItem[];
    onToggleItem: () => void;
    onAssociatedClick: (targetId: string) => void;
};

export function ItemContent({
    item,
    isOpen,
    associatedBySeries,
    associatedByTags,
    associatedByYear,
    associatedByInstalled,
    onToggleItem,
    onAssociatedClick,
    openWidth,
    openHeight,
}: Props): JSX.Element {
    const seriesNames = item.series ?? [];
    const tagNames = item.tags ?? [];

    // One deck per series
    const seriesDecks: AssociatedDeckMeta[] = seriesNames
        .map((name) => ({
            key: `series-${name}`,
            label: name,
            items: (associatedBySeries ?? []).filter((g) =>
                g.series?.includes(name)
            ),
        }))
        .filter((deck) => deck.items.length > 0);

    // One deck per tag
    const tagDecks: AssociatedDeckMeta[] = tagNames
        .map((name) => ({
            key: `tag-${name}`,
            label: name,
            items: (associatedByTags ?? []).filter((g) => g.tags?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 0);

    // Year deck
    const hasYearDeck = !!associatedByYear && associatedByYear.length > 0;
    const yearDeck: AssociatedDeckMeta | null = hasYearDeck
        ? {
            key: "year",
            label: item.year ? `Year ${String(item.year)}` : "Year",
            items: associatedByYear!,
        }
        : null;

    // Installed deck
    const hasInstalledDeck =
        !!associatedByInstalled && associatedByInstalled.length > 0;
    const installedDeck: AssociatedDeckMeta | null = hasInstalledDeck
        ? {
            key: "installed",
            label: "Installed",
            items: associatedByInstalled!,
        }
        : null;

    // Combine all decks
    const allDecks: AssociatedDeckMeta[] = [
        ...seriesDecks,
        ...(installedDeck ? [installedDeck] : []),
        ...tagDecks,
        ...(yearDeck ? [yearDeck] : []),
    ];

    const [openDeckKey, setOpenDeckKey] = React.useState<string | null>(null);

    // when item changes, reset open deck
    React.useEffect(() => {
        setOpenDeckKey(null);
    }, [item.id]);

    if (allDecks.length === 0) {
        return (
            <Collapse
                in={isOpen}
                transitionDuration={140}
                py={GRID.gap}
                pr={GRID.gap * 5}
                style={{
                    width: openWidth,
                    height: `calc(${openHeight} - ${GRID.rowHeight}px)`,
                    backgroundColor: "transparent",
                    overflowX: "hidden",
                    overflowY: "hidden",
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleItem();
                }}
            >
                <Stack style={{ height: "100%", minHeight: 0 }}>
                    <Center>
                        <Text>No associated items found.</Text>
                    </Center>
                </Stack>
            </Collapse>
        );
    }

    // Determine which deck is open
    let openDeck = allDecks[0];
    if (openDeckKey) {
        const found = allDecks.find((d) => d.key === openDeckKey);
        if (found) openDeck = found;
    }

    // smart layout
    const layoutRef = React.useRef<HTMLDivElement | null>(null);
    const [layout, setLayout] = React.useState<AssociatedLayout>({
        deckColumns: 1,
        stackColumns: 1,
        maxCardsPerDeckColumn: null,
        minStackColumns: 1,
    });

    React.useEffect(() => {
        const el = layoutRef.current;
        if (!el) return;

        const update = () => {
            const rect = el.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            const totalCards = openDeck.items
                .filter((g) => g.coverUrl)
                .slice(0, MAX_ASSOCIATED).length;

            setLayout(computeLayout(width, height, totalCards));
        };

        const ro = new ResizeObserver(update);
        ro.observe(el);
        update();

        return () => ro.disconnect();
    }, [openDeck.key, openDeck.items.length]);

    return (
        <Collapse
            in={isOpen}
            transitionDuration={140}
            py={GRID.gap}
            pr={GRID.gap * 5}
            style={{
                width: openWidth,
                height: `calc(${openHeight} - ${GRID.rowHeight}px)`,
                backgroundColor: "transparent",
                overflowX: "hidden",
                overflowY: "hidden",
            }}
            onClick={(e) => {
                e.stopPropagation();
                onToggleItem();
            }}
        >
            <Group
                align="flex-start"
                gap={GRID.gap * 3}
                wrap="nowrap"
                h="100%"
            >
                {/* left: cover column, fixed width, vertical scroll only */}
                <AssociatedDetails item={item} />

                {/* right: decks + stacks, math based on ResizeObserver */}
                <Box
                    ref={layoutRef}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        height: "100%",
                        display: "flex",
                        gap: GRID.gap * 3,
                        overflow: "hidden",
                    }}
                >
                    {/* Decks */}
                    {layout.deckColumns > 0 && (
                        <AssociatedDeck
                            label={openDeck.label}
                            items={openDeck.items}
                            currentItemId={item.id}
                            onAssociatedClick={onAssociatedClick}
                            deckColumns={layout.deckColumns}
                            maxCardsPerColumn={layout.maxCardsPerDeckColumn}
                        />
                    )}

                    {/* Stacks grid */}
                    <AssociatedStacks
                        allDecks={allDecks}
                        openDeckKey={openDeck.key}
                        onDeckClick={setOpenDeckKey}
                        columns={Math.max(layout.stackColumns, layout.minStackColumns)}
                    />
                </Box>
            </Group>
        </Collapse>
    );
}
