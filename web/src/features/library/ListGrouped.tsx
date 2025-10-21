import React from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import { RowWrapper } from "./RowWrapper";
import { AlphabeticalSeparatorRow } from "../../components/AlphabeticalSeparatorRow";
import { Scroller } from "../../components/Scroller";
import { Row } from "../hooks/useLibrary";

type Props = {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  scrollerRef: (ref: HTMLElement | Window | null) => void;
  groups: { title: string; rows: Row[] }[];
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
  return (
    <GroupedVirtuoso
      ref={virtuosoRef}
      key={remountKey}
      style={{ height: "100%" }}
      components={{ Scroller }}
      scrollerRef={scrollerRef}
      groupCounts={groups.map(g => g.rows.length)}
      increaseViewportBy={overscan}
      rangeChanged={rangeChanged}
      groupContent={(index) => (
        <AlphabeticalSeparatorRow bucket={groups[index].title} top={topOffset || 0} />
      )}
      itemContent={(index) => {
        let i = index;
        let offset = 0;
        for (const g of groups) {
          if (i < g.rows.length) {
            const r = g.rows[i];
            const globalIndex = offset + i;
            return (
              <RowWrapper
                key={`${r.id}|${installedUpdatedAt}`}
                { ...r }
                topOffset={topOffset}
                collapseOpen={openIds.has(r.id)}
                everOpened={everOpenedIds.has(r.id)}
                onToggle={() => onToggle(r.id, globalIndex)}
              />
            );
          }
          i -= g.rows.length;
          offset += g.rows.length;
        }
        return null;
      }}
    />
  );
}
