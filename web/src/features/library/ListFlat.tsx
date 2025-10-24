import React from "react";
import { Virtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import { Item } from "../hooks/useLibrary";
import { Scroller } from "../../components/Scroller";
import { ExpandableItemWrapper } from "../../components/ExpandableItem";

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

export function ListFlat({
  virtuosoRef, scrollerRef, items, topOffset, overscan, rangeChanged,
  openIds, everOpenedIds, onToggle, remountKey, installedUpdatedAt,
}: Props) {
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
            isGroupedList={false}
            layout="list"
            onToggle={() => onToggle(item.id, index)}
          />
        );
      }}
    />
  );
}