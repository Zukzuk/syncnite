import React from "react";
import { Virtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import { Item } from "./hooks/useLibrary";
import { Scroller } from "../../components/Scroller";
import { ExpandableItemWrapper } from "../../components/ExpandableItem";
import { GRID } from "../../lib/constants";

type Props = {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  scrollerRef: (ref: HTMLElement | Window | null) => void;
  items: Item[];
  topOffset: number;
  overscan: { top: number; bottom: number };
  rangeChanged: (range: { startIndex: number; endIndex: number }) => void;
  openIds: Set<string>;
  everOpenedIds: Set<string>;
  onToggle: (id: string, index: number) => void;
  remountKey: string;
  installedUpdatedAt?: string;
};

/**
 * ListFlat component for displaying library items in a virtualized flat list layout.
 * Props:
 * - virtuosoRef: Ref to the Virtuoso handle for controlling the list.
 * - scrollerRef: Ref callback for the scroller element.
 * - items: Array of library items to display.
 * - topOffset: Number of pixels to offset the top of the list.
 * - overscan: Number of pixels to overscan above and below the viewport.
 * - rangeChanged: Callback when the visible range changes.
 * - openIds: Set of item IDs that are currently expanded.
 * - everOpenedIds: Set of item IDs that have ever been expanded.
 * - onToggle: Callback to toggle the expanded state of an item.
 * - remountKey: Key to force remounting the list.
 * - installedUpdatedAt: Optional timestamp for installed updates.
 */
export function ListFlat({
  virtuosoRef, scrollerRef, items, topOffset, overscan, rangeChanged,
  openIds, everOpenedIds, onToggle, remountKey, installedUpdatedAt,
}: Props) {
  // ensure scroll position is maintained on layout changes
  const openWidth = `calc(100vw - ${GRID.menuWidth}px - 12px - 15px)`;
  const openHeight = `calc(100vh - ${topOffset}px - ${GRID.smallBox}px - 12px)`;

  return (
    <Virtuoso
      ref={virtuosoRef}
      key={remountKey}
      style={{ height: "100%" }}
      components={{ Scroller }}
      scrollerRef={scrollerRef}
      data={items}
      increaseViewportBy={overscan}
      rangeChanged={rangeChanged}
      computeItemKey={(_index, item: any) => `${item.id}|${installedUpdatedAt}`}
      itemContent={(index) => {
        const item = items[index];
        return (
          <ExpandableItemWrapper
            item={item}
            collapseOpen={openIds.has(item.id)}
            everOpened={everOpenedIds.has(item.id)}
            topOffset={topOffset}
            openWidth={openWidth}
            openHeight={openHeight}
            layout="list"
            onToggle={() => onToggle(item.id, index)}
          />
        );
      }}
    />
  );
}