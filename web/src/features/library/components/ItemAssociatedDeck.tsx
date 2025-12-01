import { Box } from "@mantine/core";
import { ItemAssociatedCards } from "./ItemAssociatedCards";
import { GameItem } from "../../../types/types";
import { GRID } from "../../../lib/constants";

type Props = {
    item: GameItem;
    bySeries?: GameItem[];
    byTags?: GameItem[];
    byYear?: GameItem[];
    onAssociatedClick: (targetId: string) => void;
};

export function ItemAssociatedDecks({ item, bySeries, byTags, byYear, onAssociatedClick }: Props): JSX.Element | null {
    const seriesNames = item.series ?? [];
    const tagNames = item.tags ?? [];

    // One deck per series
    const seriesDecks = seriesNames
        .map((name) => ({
            key: `series-${name}`,
            label: name,
            items: (bySeries ?? []).filter((g) => g.series?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 0);

    // One deck per tag
    const tagDecks = tagNames
        .map((name) => ({
            key: `tag-${name}`,
            label: name,
            items: (byTags ?? []).filter((g) => g.tags?.includes(name)),
        }))
        .filter((deck) => deck.items.length > 0);

    const hasYearDeck = !!byYear && byYear.length > 0;
    const hasAny =
        seriesDecks.length > 0 || tagDecks.length > 0 || hasYearDeck;

    if (!hasAny) return null;

    return (
        <Box
            className="subtle-scrollbar"
            style={{
                height: "100%",
                width: "100%",
                overflowX: "scroll",
                overflowY: "hidden",
            }}
        >
            <Box
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "stretch",
                    gap: GRID.gap * 3,
                    height: "100%",
                }}
            >
                {seriesDecks.map((deck) => (
                    <ItemAssociatedCards
                        key={deck.key}
                        label={deck.label}
                        items={deck.items}
                        onAssociatedClick={onAssociatedClick}
                    />
                ))}

                {tagDecks.map((deck) => (
                    <ItemAssociatedCards
                        key={deck.key}
                        label={deck.label}
                        items={deck.items}
                        onAssociatedClick={onAssociatedClick}
                    />
                ))}

                {hasYearDeck && (
                    <ItemAssociatedCards
                        key="year"
                        label={item.year ? String(item.year) : "Year"}
                        items={byYear!}
                        onAssociatedClick={onAssociatedClick}
                    />
                )}
            </Box>
        </Box>
    );
}