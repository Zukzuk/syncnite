import React from "react";
import { Group, Collapse, Box } from "@mantine/core";
import { AssociatedLayout, AssociatedItems, GameItem, ScoredHit } from "../../../types/types";
import { GRID } from "../../../lib/constants";
import { AssociatedDeck } from "./AssociatedDeck";
import { AssociatedStacks } from "./AssociatedStacks";
import { AssociatedDetails } from "./AssociatedDetails";

/**
 * Very simple fuzzy search:
 *  1. A hit happens if query and item share at least one full word (case-insensitive).
 *  2. Score = length (in characters) of the *longest* overlapping word.
 *  3. Returns *all* items reordered by score (desc).
 */
export function fuzzyWordOverlap<T>(
    query: string,
    items: T[],
    toString: (item: T) => string = (x => String(x))
): ScoredHit<T>[] {
    const queryWords = tokenize(query);

    const hits: ScoredHit<T>[] = [];

    for (const item of items) {
        const text = toString(item);
        const candidateWords = tokenize(text);

        let maxScore = 0;

        for (const q of queryWords) {
            for (const w of candidateWords) {
                if (q && w && q === w) {
                    const wordLen = w.length;
                    if (wordLen > maxScore) {
                        maxScore = wordLen;
                    }
                }
            }
        }

        // Always include item — even if maxScore = 0
        hits.push({ item, score: maxScore });
    }

    // Sort by score (desc), stable for equal scores
    hits.sort((a, b) => b.score - a.score);

    return hits;
}

// Tokenize a string into lowercase words, removing non-alphanumeric characters.
function tokenize(input: string): string[] {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, " ")
        .split(/\s+/)
        .filter(Boolean);
}

function buildAssociatedDecks(
    isOpen: boolean,
    item: GameItem,
    all: GameItem[]
): { associatedDecks: AssociatedItems[] } {
    if (!isOpen) return { associatedDecks: [] };

    const associatedSeries: GameItem[] = [];
    const associatedTags: GameItem[] = [];
    const associatedYear: GameItem[] = [];
    const associatedInstalled: GameItem[] = [];
    const associatedHidden: GameItem[] = [];

    const seriesSet = item.series ? new Set(item.series) : null;
    const tagsSet = item.tags ? new Set(item.tags) : null;

    for (let i = 0; i < all.length; i++) {
        const other = all[i];

        if (seriesSet &&
            other.series &&
            other.series.some((s) => seriesSet.has(s))
        ) {
            other.index = i;
            associatedSeries.push(other);
        }

        if (tagsSet &&
            other.tags &&
            other.tags.some((t) => tagsSet.has(t))
        ) {
            other.index = i;
            associatedTags.push(other);
        }

        if (item.year &&
            other.year === item.year
        ) {
            other.index = i;
            associatedYear.push(other);
        }

        if (item.isInstalled &&
            other.isInstalled
        ) {
            other.index = i;
            associatedInstalled.push(other);
        }

        if (item.isHidden &&
            other.isHidden
        ) {
            other.index = i;
            associatedHidden.push(other);
        }
    }

    const scoredWords = fuzzyWordOverlap(item.sortingName ?? item.title, item.series ?? []);
    const seriesNames = scoredWords.sort((a, b) => b.score - a.score).map((w) => w.item);
    const tagNames = item.tags ?? [];

    // One deck per series

    const seriesDecks = seriesNames
        .map((name) => ({
            key: `series-${name}`,
            label: name,
            items: associatedSeries.filter((g) => g.series?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 0);

    // One deck per tag
    const tagDecks = tagNames
        .map((name) => ({
            key: `tag-${name}`,
            label: name,
            items: associatedTags.filter((g) => g.tags?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 0);

    // Year deck
    const yearDeck =
        associatedYear.length > 0
            ? {
                key: "year",
                label: item.year ? `Year ${String(item.year)}` : "Year",
                items: associatedYear,
            }
            : null;

    // Installed deck
    const installedDeck =
        associatedInstalled.length > 0
            ? {
                key: "installed",
                label: "Installed",
                items: associatedInstalled,
            }
            : null;

    // Hidden deck
    const hiddenDeck =
        associatedHidden.length > 0
            ? {
                key: "hidden",
                label: "Hidden",
                items: associatedHidden,
            }
            : null;

    const associatedDecks = [
        ...seriesDecks,
        ...(installedDeck ? [installedDeck] : []),
        ...(hiddenDeck ? [hiddenDeck] : []),
        ...tagDecks,
        ...(yearDeck ? [yearDeck] : []),
    ];

    return { associatedDecks };
}

function calcAssociatedLayout(
    width: number,
    height: number,
    totalCards: number
): AssociatedLayout {
    if (width <= 0 || height <= 0 || totalCards === 0) {
        return {
            deckColumns: 0,
            stackColumns: Math.max(1, Math.floor(width / (GRID.cardWidth * 0.7))),
            maxCardsPerDeckColumn: null,
            minStackColumns: 1,
        };
    }

    const deckColWidth = GRID.cardWidth + GRID.gap * 2;
    const stackColWidth = GRID.cardWidth * 0.7 + GRID.gap;

    const cardHeight = (GRID.cardWidth * 32) / 23;
    const stepY = GRID.card_step_y;

    const maxCardsPerColumnByHeight = Math.max(
        1,
        Math.floor((height - cardHeight) / stepY) + 1
    );

    const neededColsByHeight = Math.max(
        1,
        Math.ceil(totalCards / maxCardsPerColumnByHeight)
    );

    let maxDeckColsByWidth = 0;

    // Try increasing deck columns; only accept a value if we still
    // have enough width left for the *dynamic* minimum stack columns.
    for (let cols = 1; cols <= neededColsByHeight; cols++) {
        const minStackColsForCols = cols >= 6 ? 2 : 1;
        const usedWidthForDeck = cols * deckColWidth;
        const remainingWidth = width - usedWidthForDeck;

        if (remainingWidth < stackColWidth * minStackColsForCols) {
            break;
        }

        maxDeckColsByWidth = cols;
    }

    if (maxDeckColsByWidth === 0) {
        const deckColumns = 1;
        const minStackColumns = deckColumns >= 6 ? 2 : 1;
        const remainingWidth = width - deckColumns * deckColWidth;
        const stackColumns =
            remainingWidth >= stackColWidth
                ? Math.max(
                    minStackColumns,
                    Math.floor(remainingWidth / stackColWidth)
                )
                : 0;

        return {
            deckColumns,
            stackColumns,
            maxCardsPerDeckColumn: null,
            minStackColumns,
        };
    }

    const deckColumns = Math.min(neededColsByHeight, maxDeckColsByWidth);
    const minStackColumns = deckColumns >= 6 ? 2 : 1;
    const hitWidthLimit = deckColumns < neededColsByHeight;

    const usedWidthForDeck = deckColumns * deckColWidth;
    const remainingWidth = width - usedWidthForDeck;
    const maxStackColsByWidth =
        remainingWidth > 0 ? Math.floor(remainingWidth / stackColWidth) : 0;

    let stackColumns: number;

    if (maxStackColsByWidth <= 0) {
        stackColumns = 0;
    } else if (hitWidthLimit) {
        stackColumns = Math.max(
            minStackColumns,
            Math.min(deckColumns, maxStackColsByWidth)
        );
    } else {
        stackColumns = Math.max(minStackColumns, maxStackColsByWidth);
    }

    return {
        deckColumns,
        stackColumns,
        maxCardsPerDeckColumn: hitWidthLimit ? null : maxCardsPerColumnByHeight,
        minStackColumns,
    };
}

type Props = {
    item: GameItem;
    isOpen: boolean;
    openWidth: string;
    openHeight: string;
    itemsAssociated: GameItem[];
    onWallpaperBg: (on: boolean) => void;
    onToggleClickBounded: (id?: string) => void;
};

// Content component for an expanded library item, showing associated decks and stacks.
export function ItemContent({
    item,
    isOpen,
    openWidth,
    openHeight,
    itemsAssociated,
    onWallpaperBg,
    onToggleClickBounded,
}: Props): JSX.Element {
    const {
        associatedDecks
    } = buildAssociatedDecks(
        isOpen,
        item,
        itemsAssociated
    );

    const [openDeckKey, onStackClick] = React.useState<string | null>(null);
    React.useEffect(() => onStackClick(null), [item.id]);

    // select the open deck
    const openDeck = React.useMemo<AssociatedItems | null>(() => {
        if (!associatedDecks || associatedDecks.length === 0) return null;
        if (openDeckKey) {
            const found = associatedDecks.find((d) => d.key === openDeckKey);
            if (found) return found;
        }
        return associatedDecks[0];
    }, [associatedDecks, openDeckKey]);

    // smart layout
    const layoutRef = React.useRef<HTMLDivElement | null>(null);
    const [layout, setLayout] = React.useState<AssociatedLayout>({
        deckColumns: 1,
        stackColumns: 1,
        maxCardsPerDeckColumn: null,
        minStackColumns: 1,
    });

    // update layout on size or deck changes
    React.useEffect(() => {
        const el = layoutRef.current;
        if (!el || !openDeck) {
            setLayout((prev) => ({
                ...prev,
                deckColumns: 0,
                stackColumns: 0,
            }));
            return;
        }

        const update = () => {
            const rect = el.getBoundingClientRect();
            const width = rect.width - GRID.gap * 5;
            const height = rect.height;

            const totalCards = openDeck.items
                .filter((g) => g.coverUrl).length;

            setLayout(
                calcAssociatedLayout(
                    width,
                    height,
                    totalCards
                )
            );
        };

        const ro = new ResizeObserver(update);
        ro.observe(el);
        update();

        return () => ro.disconnect();
    }, [openDeck?.key, openDeck?.items.length]);

    return (
        <Collapse
            aria-label="item-content"
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
        >
            <Group align="flex-start" gap={GRID.gap * 3} wrap="nowrap" h="100%">
                <AssociatedDetails
                    item={item}
                    onWallpaperBg={onWallpaperBg}
                />
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
                    {openDeck && layout.deckColumns > 0 && (
                        <AssociatedDeck
                            label={openDeck.label}
                            items={openDeck.items}
                            currentItemId={item.id}
                            deckColumns={layout.deckColumns}
                            maxCardsPerColumn={layout.maxCardsPerDeckColumn}
                            onToggleClickBounded={onToggleClickBounded}
                        />
                    )}
                    {associatedDecks.length > 0 && (
                        <AssociatedStacks
                            associatedDecks={associatedDecks}
                            openDeckKey={openDeck ? openDeck.key : null}
                            stackColumns={Math.max(layout.stackColumns, layout.minStackColumns)}
                            onStackClick={onStackClick}
                        />
                    )}
                </Box>
            </Group>
        </Collapse>
    );
}
