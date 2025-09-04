import React from "react";
import { Box, Flex, ScrollArea, Table } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import type { Loaded } from "../../lib/data";
import { useLibraryState } from "./useLibraryState";
import { Controls } from "./Controls";
import { TableHeader } from "./TableHeader";
import { AlphaSeparatorRow } from "./AlphaSeparatorRow";
import { GameRow } from "./GameRow";
import { SCROLLBAR_SIZE } from "./constants";

export function LibraryView({ data }: { data: Loaded }) {
  const { ui, derived } = useLibraryState(data);
  const { ref: theadRef, height: theadH } = useElementSize();

  // lock page scroll elsewhere (index.css: html,body,#root { height:100%; overflow:hidden })
  return (
    <Flex direction="column" h="100%">
      <Box p="md">
        <Controls
          q={ui.q} setQ={ui.setQ}
          source={ui.source} setSource={ui.setSource} sources={data.allSources}
          tag={ui.tag} setTag={ui.setTag} tags={data.allTags}
          showHidden={ui.showHidden} setShowHidden={ui.setShowHidden}
          filteredCount={derived.filteredCount} totalCount={derived.totalCount}
        />
      </Box>

      <ScrollArea
        flex={1}
        type="auto"
        scrollbars="y"
        offsetScrollbars
        scrollbarSize={SCROLLBAR_SIZE}
      >
        <Table verticalSpacing="xs" highlightOnHover stickyHeader stickyHeaderOffset={0}>
          <TableHeader
            theadRef={theadRef}
            headerHeight={theadH}
            sortKey={ui.sortKey}
            sortDir={ui.sortDir}
            onToggleSort={ui.toggleSort}
          />
          <Table.Tbody>
            {(() => {
              const out: React.ReactNode[] = [];
              let prevBucket: string | null = null;
              for (const { row, bucket } of derived.withBuckets) {
                if (bucket !== prevBucket) {
                  prevBucket = bucket;
                  out.push(<AlphaSeparatorRow key={`sep-${bucket}-${out.length}`} bucket={bucket} top={theadH || 0} />);
                }
                out.push(
                  <GameRow
                    key={row.id}
                    id={row.id}
                    hidden={row.hidden}
                    showHidden={ui.showHidden}
                    iconUrl={row.iconUrl}
                    title={row.title}
                    source={row.source}
                    tags={row.tags}
                    url={row.url}
                  />
                );
              }
              return out;
            })()}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Flex>
  );
}
