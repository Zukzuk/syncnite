import { fuzzyWordOverlap } from "../services/SearchService";
import { AssociatedItems } from "../types/app";
import { InterLinkedItem } from "../types/interlinked";

// Hook to gather associated data for a given item based on various attributes.
export function useAssociatedData(
    isOpen: boolean,
    item: InterLinkedItem,
    all: InterLinkedItem[]
): { associatedData: AssociatedItems[] } {
    if (!isOpen) return { associatedData: [] };

    const associatedSeries: InterLinkedItem[] = [];
    const associatedTags: InterLinkedItem[] = [];
    const associatedDevelopers: InterLinkedItem[] = [];
    const associatedYear: InterLinkedItem[] = [];
    const associatedInstalled: InterLinkedItem[] = [];
    const associatedHidden: InterLinkedItem[] = [];
    const associatedSpecialEditions: InterLinkedItem[] = [];
    const associatedMods: InterLinkedItem[] = [];

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

        if (item.version && item.version.toLowerCase() === "mod" && other.version && other.version.toLowerCase() === "mod") {
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

    const associatedData = [
        ...seriesDecks,
        ...developerDecks,
        ...(modsDeck ? [modsDeck] : []),
        ...(specialEditionsDeck ? [specialEditionsDeck] : []),
        ...tagDecks,
        ...(installedDeck ? [installedDeck] : []),
        ...(hiddenDeck ? [hiddenDeck] : []),
        ...(yearDeck ? [yearDeck] : []),
    ];

    return { associatedData };
}