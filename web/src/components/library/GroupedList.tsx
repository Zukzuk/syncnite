import React from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import { GameRow } from "./GameRow";
import { AlphabeticalSeparatorRow } from "../ui/AlphabeticalSeparatorRow";
import { Scroller } from "../ui/Scroller";
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

export function GroupedList({
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
              <GameRow
                key={`${r.id}|${installedUpdatedAt}`}
                id={r.id}
                gameId={r.gameId}
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
