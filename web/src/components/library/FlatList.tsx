import React from "react";
import { Virtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import { GameRow } from "./GameRow";
import { Scroller } from "../ui/Scroller";
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

export function FlatList({
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
          <GameRow
            id={r.id}
            hidden={r.hidden}
            installed={r.installed}
            iconUrl={r.iconUrl}
            title={r.title}
            source={r.source}
            tags={r.tags}
            year={r.year}
            url={r.url}
            raw={r.raw}
            sortingName={r.sortingName}
            topOffset={topOffset}
            collapseOpen={openIds.has(r.id)}
            everOpened={everOpenedIds.has(r.id)}
            onToggle={() => onToggle(r.id, index)}
          />
        );
      }}
    />
  );
}
