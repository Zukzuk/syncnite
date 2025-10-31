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

export function ListGrouped({
  virtuosoRef, scrollerRef, groups, topOffset, overscan, rangeChanged,
  openIds, everOpenedIds, onToggle, remountKey, installedUpdatedAt,
}: Props) {
  // ensure scroll position is maintained on layout changes
  const openWidth = `calc(100vw - ${GRID.menuWidth}px - 12px - 15px)`;
  const openHeight = `calc(100vh - ${topOffset}px - 38px - ${GRID.smallBox}px - 12px)`;

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