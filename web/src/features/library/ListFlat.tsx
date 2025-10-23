import React from "react";
import { Virtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import { RowWrapper } from "./RowWrapper";
import { Scroller } from "../../components/Scroller";
import { Row } from "../hooks/useLibrary";

type Props = {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  scrollerRef: (ref: HTMLElement | Window | null) => void;
  rows: Row[];
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
  virtuosoRef, scrollerRef, rows, topOffset, overscan, rangeChanged,
  openIds, everOpenedIds, onToggle, remountKey, installedUpdatedAt,
}: Props) {
  return (
    <Virtuoso
      ref={virtuosoRef}
      key={remountKey}
      style={{ height: "100%" }}
      components={{ Scroller }}
      scrollerRef={scrollerRef}
      data={rows}
      increaseViewportBy={overscan}
      rangeChanged={rangeChanged}
      computeItemKey={(_index, r: any) => `${r.id}|${installedUpdatedAt}`}
      itemContent={(index) => {
        const r = rows[index];
        return (
          <RowWrapper
            key={`${r.id}|${installedUpdatedAt}`}
            {...r}
            topOffset={topOffset}
            collapseOpen={openIds.has(r.id)}
            everOpened={everOpenedIds.has(r.id)}
            onToggle={() => onToggle(r.id, index)}
            isGroupedList={false}
          />
        );
      }}
    />
  );
}
