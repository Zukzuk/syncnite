import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Collapse, Box } from "@mantine/core";
import { AssociatedLayout, AssociatedItems, ScoredHit, NavMode, DesktopNavMode } from "../../types/app";
import { AssociatedDeck } from "./components/AssociatedDeck";
import { AssociatedStacks } from "./components/AssociatedStacks";
import { AssociatedDetails } from "./components/AssociatedDetails";
import { useLibraryContext } from "../LibraryContext";
import { InterLinkedGrid, InterLinkedGameItem } from "../../types/interlinked";

export function fuzzyWordOverlap<T>(
    query: string,
    items: T[],
    toString: (item: T) => string = (x) => String(x)
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
    item: InterLinkedGameItem,
    all: InterLinkedGameItem[]
): { associatedDecks: AssociatedItems[] } {
    if (!isOpen) return { associatedDecks: [] };

    const associatedSeries: InterLinkedGameItem[] = [];
    const associatedTags: InterLinkedGameItem[] = [];
    const associatedDevelopers: InterLinkedGameItem[] = [];
    const associatedYear: InterLinkedGameItem[] = [];
    const associatedInstalled: InterLinkedGameItem[] = [];
    const associatedHidden: InterLinkedGameItem[] = [];
    const associatedSpecialEditions: InterLinkedGameItem[] = [];
    const associatedMods: InterLinkedGameItem[] = [];

    const seriesSet = item.series ? new Set(item.series) : null;
    const tagsSet = item.tags ? new Set(item.tags) : null;
    const developersSet = item.developers ? new Set(item.developers) : null;

    for (let i = 0; i < all.length; i++) {
        const other = all[i];

        if (seriesSet && other.series && other.series.some((s) => seriesSet.has(s))) {
            other.index = i;
            associatedSeries.push(other);
        }

        if (tagsSet && other.tags && other.tags.some((t) => tagsSet.has(t))) {
            other.index = i;
            associatedTags.push(other);
        }

        if (developersSet && other.developers && other.developers.some((d) => developersSet.has(d))) {
            other.index = i;
            associatedDevelopers.push(other);
        }

        if (item.year && other.year === item.year) {
            other.index = i;
            associatedYear.push(other);
        }

        if (item.isInstalled && other.isInstalled) {
            other.index = i;
            associatedInstalled.push(other);
        }

        if (item.isHidden && other.isHidden) {
            other.index = i;
            associatedHidden.push(other);
        }

        if (item.version && item.version.toLowerCase() !== "mod" && other.version && other.version.toLowerCase() !== "mod") {
            other.index = i;
            associatedSpecialEditions.push(other);
        }

        if ( item.version && item.version.toLowerCase() === "mod" && other.version && other.version.toLowerCase() === "mod") {
            other.index = i;
            associatedMods.push(other);
        }
    }

    const scoredWords = fuzzyWordOverlap(item.sortingName ?? item.title, item.series ?? []);
    const seriesNames = scoredWords.sort((a, b) => b.score - a.score).map((w) => w.item);
    const tagNames = item.tags ?? [];
    const developerNames = item.developers ?? [];

    // One deck per series
    const seriesDecks = seriesNames
        .map((name) => ({
            key: `series-${name}`,
            label: name,
            items: associatedSeries.filter((g) => g.series?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 1);

    // One deck per tag
    const tagDecks = tagNames
        .map((name) => ({
            key: `tag-${name}`,
            label: name,
            items: associatedTags.filter((g) => g.tags?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 1);

    // One deck per developer
    const developerDecks = developerNames
        .map((name) => ({
            key: `developer-${name}`,
            label: name,
            items: associatedDevelopers.filter((g) => g.developers?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 1);

    // Year deck
    const yearDeck =
        associatedYear.length > 1
            ? {
                key: "year",
                label: item.year ? `Year ${String(item.year)}` : "Year",
                items: associatedYear,
            }
            : null;

    // Installed deck
    const installedDeck =
        associatedInstalled.length > 1
            ? {
                key: "installed",
                label: "Installed",
                items: associatedInstalled,
            }
            : null;

    // Hidden deck
    const hiddenDeck =
        associatedHidden.length > 1
            ? {
                key: "hidden",
                label: "Hidden",
                items: associatedHidden,
            }
            : null;

    // Special Editions deck
    const specialEditionsDeck =
        associatedSpecialEditions.length > 1
            ? {
                key: "special-editions",
                label: "Special Editions",
                items: associatedSpecialEditions,
            }
            : null;

    // Special Editions deck
    const modsDeck =
        associatedMods.length > 1
            ? {
                key: "mods",
                label: "Mods",
                items: associatedMods,
            }
            : null;

    const associatedDecks = [
        ...seriesDecks,
        ...(modsDeck ? [modsDeck] : []),
        ...(specialEditionsDeck ? [specialEditionsDeck] : []),
        ...developerDecks,
        ...tagDecks,
        ...(installedDeck ? [installedDeck] : []),
        ...(hiddenDeck ? [hiddenDeck] : []),
        ...(yearDeck ? [yearDeck] : []),
    ];

    return { associatedDecks };
}

function calcAssociatedLayout(
    width: number,
    height: number,
    totalCards: number,
    grid: InterLinkedGrid
): AssociatedLayout {
    if (!grid.cardWidth || !grid.cardHeight) {
        return {
            deckColumns: 0,
            stackColumns: 0,
            maxCardsPerDeckColumn: null,
            minStackColumns: 1,
        };
    }

    if (width <= 0 || height <= 0 || !totalCards) {
        return {
            deckColumns: 0,
            stackColumns: Math.max(1, Math.floor(width / (grid.cardWidth * 0.7))),
            maxCardsPerDeckColumn: null,
            minStackColumns: 1,
        };
    }

    const deckColWidth = grid.cardWidth + grid.gap * 2;
    const stackColWidth = grid.cardWidth * 0.7 + grid.gap;
    const cardHeight = (grid.cardWidth * 32) / 23;
    const stepY = grid.cardStepY;
    const maxCardsPerColumnByHeight = Math.max(1, Math.floor((height - cardHeight) / stepY) + 1);
    const neededColsByHeight = Math.max(1, Math.ceil(totalCards / maxCardsPerColumnByHeight));

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
            remainingWidth >= stackColWidth ? Math.max(minStackColumns, Math.floor(remainingWidth / stackColWidth)) : 0;

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
    const maxStackColsByWidth = remainingWidth > 0 ? Math.floor(remainingWidth / stackColWidth) : 0;

    let stackColumns: number;

    if (maxStackColsByWidth <= 0) {
        stackColumns = 0;
    } else if (hitWidthLimit) {
        stackColumns = Math.max(minStackColumns, Math.min(deckColumns, maxStackColsByWidth));
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
    item: InterLinkedGameItem;
    isOpen: boolean;
    grid: InterLinkedGrid;
    isDark: boolean;
    cssOpenWidth: string;
    cssOpenHeight: string;
    itemsAssociated: InterLinkedGameItem[];
    onWallpaperBg: (on: boolean) => void;
    onToggleClickBounded: (id?: string, navMode?: NavMode) => void;
};

// Content component for an expanded library item, showing associated decks and stacks.
export function AssociatedContent({
    item,
    isOpen,
    grid,
    isDark,
    cssOpenWidth,
    cssOpenHeight,
    itemsAssociated,
    onWallpaperBg,
    onToggleClickBounded,
}: Props): JSX.Element | null {
    if (!isOpen) return null;

    const { associatedDecks } = buildAssociatedDecks(isOpen, item, itemsAssociated);
    const lib = useLibraryContext();

    // prepare available deck keys
    const availableKeys = useMemo(
        () => associatedDecks.map((d) => d.key), [associatedDecks]
    );

    // pick the open deck key
    const openDeckKey = useMemo(
        () => lib.pickDeckKey(item.id, availableKeys),
        [lib.version, item.id, availableKeys, lib]
    );

    // handle stack click
    const handleDeckChange = useCallback(
        (key: string) => lib.setSelectedDeckKey(item.id, key), [lib, item.id]
    );

    // select the open deck
    const openDeck = useMemo<AssociatedItems | null>(() => {
        if (!associatedDecks || associatedDecks.length === 0) return null;
        if (openDeckKey) {
            const found = associatedDecks.find((d) => d.key === openDeckKey);
            if (found) return found;
        }
        return associatedDecks[0];
    }, [associatedDecks, openDeckKey]);

    // If this item has no explicit selection yet, and we're reusing the same deckKey as last time, don't animate
    const perItemSelected = lib.getSelectedDeckKey(item.id);
    const lastSelected = lib.getLastSelectedDeckKey();
    const animateDeckIn = !(
        perItemSelected == null &&
        lastSelected != null &&
        openDeckKey != null &&
        openDeckKey === lastSelected
    );

    // smart layout
    const layoutRef = useRef<HTMLDivElement | null>(null);
    const [layout, setLayout] = useState<AssociatedLayout>({
        deckColumns: 1,
        stackColumns: 1,
        maxCardsPerDeckColumn: null,
        minStackColumns: 1,
    });
    const gapRight = grid.gap * 7;

    // update layout on size or deck changes
    useEffect(() => {
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
            const width = rect.width - gapRight;
            const height = rect.height;
            const totalCards = openDeck.items.filter((g) => g.coverUrl).length;

            setLayout(calcAssociatedLayout(width, height, totalCards, grid));
        };

        const ro = new ResizeObserver(update);
        ro.observe(el);
        update();

        return () => ro.disconnect();
    }, [openDeck?.key, openDeck?.items.length, grid]);

    return (
        <Collapse
            aria-label="item-content"
            in={isOpen}
            transitionDuration={140}
            py={grid.gap}
            pr={gapRight}
            style={{
                width: cssOpenWidth,
                height: `calc(${cssOpenHeight} - ${grid.rowHeight}px)`,
                backgroundColor: "transparent",
                overflowX: "hidden",
                overflowY: "hidden",
            }}
        >
            <Group align="flex-start" gap={grid.gap * 3} wrap="nowrap" h="100%">
                <AssociatedDetails
                    item={item}
                    grid={grid}
                    isDark={isDark}
                    openDeckKey={openDeck ? openDeck.key : null}
                    onBadgeClick={handleDeckChange}
                    onWallpaperBg={onWallpaperBg}
                />

                <Box
                    ref={layoutRef}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        height: "100%",
                        display: "flex",
                        gap: grid.gap * 3,
                        overflow: "hidden",
                    }}
                >
                    {openDeck && layout.deckColumns > 0 && (
                        <AssociatedDeck
                            deckKey={openDeck.key}
                            animateIn={animateDeckIn}
                            label={openDeck.label}
                            items={openDeck.items}
                            currentItemId={item.id}
                            deckColumns={layout.deckColumns}
                            maxCardsPerColumn={layout.maxCardsPerDeckColumn}
                            isDark={isDark}
                            grid={grid}
                            onToggleClickBounded={onToggleClickBounded}
                        />
                    )}
                    {associatedDecks.length > 0 && (
                        <AssociatedStacks
                            currentItemId={item.id}
                            associatedDecks={associatedDecks}
                            openDeckKey={openDeck ? openDeck.key : null}
                            stackColumns={Math.max(layout.stackColumns, layout.minStackColumns)}
                            isDark={isDark}
                            grid={grid}
                            onStackClick={handleDeckChange}
                        />
                    )}
                </Box>
            </Group>
        </Collapse>
    );
}
