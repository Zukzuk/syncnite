import React from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import { Item } from "./hooks/useLibrary";
import { AlphabeticalSeparatorRow } from "../../components/AlphabeticalSeparatorRow";
import { Scroller } from "../../components/Scroller";
import { ExpandableItemWrapper } from "../../components/ExpandableItem";
import { GRID } from "../../lib/constants";

type Props = {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  scrollerRef: (ref: HTMLElement | Window | null) => void;
  groups: { title: string; items: Item[] }[];
  topOffset: number;
  overscan: { top: number; bottom: number };
  rangeChanged: (range: { startIndex: number; endIndex: number }) => void;
  openIds: Set<string>;
  everOpenedIds: Set<string>;
  onToggle: (id: string, globalIndex: number) => void;
  remountKey: string;
  installedUpdatedAt?: string;
};

/**
 * ListGrouped component for displaying library items in a virtualized grouped list layout.
 * Props:
 * - virtuosoRef: Ref to the Virtuoso handle for controlling the list.
 * - scrollerRef: Ref callback for the scroller element.
 * - groups: Array of grouped library items to display.
 * - topOffset: Number of pixels to offset the top of the list.
 * - overscan: Number of pixels to overscan above and below the viewport.
 * - rangeChanged: Callback when the visible range changes.
 * - openIds: Set of item IDs that are currently expanded.
 * - everOpenedIds: Set of item IDs that have ever been expanded.
 * - onToggle: Callback to toggle the expanded state of an item.
 * - remountKey: Key to force remounting the list.
 * - installedUpdatedAt: Optional timestamp for installed updates.
 */
export function ListGrouped({
  virtuosoRef, scrollerRef, groups, topOffset, overscan, rangeChanged,
  openIds, everOpenedIds, onToggle, remountKey, installedUpdatedAt,
}: Props) {
  // ensure scroll position is maintained on layout changes
  const openWidth = `calc(100vw - ${GRID.menuWidth}px - 12px - 15px)`;
  const openHeight = `calc(100vh - ${topOffset}px - 38px - ${GRID.iconSize}px - 12px)`;

  return (
    <GroupedVirtuoso
      ref={virtuosoRef}
      key={remountKey}
      style={{ height: "100%" }}
      components={{ Scroller }}
      scrollerRef={scrollerRef}
      groupCounts={groups.map(g => g.items.length)}
      increaseViewportBy={overscan}
      rangeChanged={rangeChanged}
      // computeItemKey={(_index, item: any) => `${item.id}|${installedUpdatedAt}`}
      groupContent={(index) => (
        <AlphabeticalSeparatorRow
          bucket={groups[index].title}
          top={topOffset || 0}
        />
      )}
      itemContent={(index) => {
        let i = index;
        let offset = 0;
        for (const g of groups) {
          if (i < g.items.length) {
            const item = g.items[i];
            const globalIndex = offset + i;
            return (
              <ExpandableItemWrapper
                item={item}
                collapseOpen={openIds.has(item.id)}
                everOpened={everOpenedIds.has(item.id)}
                topOffset={topOffset}
                openWidth={openWidth}
                openHeight={openHeight}
                layout="list"
                onToggle={() => onToggle(item.id, globalIndex)}
              />
            );
          }
          i -= g.items.length;
          offset += g.items.length;
        }
        return null;
      }}
    />
  );
}