import React from "react";
import { Box, Flex, Table } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import type { Loaded } from "../../lib/data";
import { useLibraryState } from "./useLibraryState";
import { Controls } from "./Controls";
import { TableHeader } from "./TableHeader";
import { AlphaSeparatorRow } from "./AlphaSeparatorRow";
import { GameRow } from "./GameRow";

export function LibraryView({
  data,
  onCountsChange,
}: {
  data: Loaded;
  onCountsChange?: (filtered: number, total: number) => void;
}) {
  const { ui, derived } = useLibraryState(data);
  const { ref: theadRef, height: theadH } = useElementSize();

  React.useEffect(() => {
    onCountsChange?.(derived.filteredCount, derived.totalCount);
  }, [derived.filteredCount, derived.totalCount, onCountsChange]);

  return (
    <Flex direction="column" h="100%" style={{ minHeight: 0 }}>
      <Box p="md">
        <Controls
          q={ui.q} setQ={ui.setQ}
          source={ui.source} setSource={ui.setSource} sources={data.allSources}
          tag={ui.tag} setTag={ui.setTag} tags={data.allTags}
          showHidden={ui.showHidden} setShowHidden={ui.setShowHidden}
          installedOnly={ui.installedOnly} setInstalledOnly={ui.setInstalledOnly}
        />
      </Box>
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <Table
          className="library-table"
          verticalSpacing="xs"
          highlightOnHover
          stickyHeader
          stickyHeaderOffset={0}
        >
          <TableHeader
            theadRef={theadRef}
            headerHeight={theadH}
            sortKey={ui.sortKey}
            sortDir={ui.sortDir}
            onToggleSort={ui.toggleSort}
          />
          <Table.Tbody>
            {ui.sortKey === "title" ? (
              (() => {
                const out: React.ReactNode[] = [];
                let prevBucket: string | null = null;
                for (const { row, bucket } of derived.withBuckets) {
                  if (bucket !== prevBucket) {
                    prevBucket = bucket;
                    out.push(
                      <AlphaSeparatorRow
                        key={`sep-${bucket}-${out.length}`}
                        bucket={bucket}
                        top={theadH || 0}
                      />
                    );
                  }
                  out.push(
                    <GameRow
                      key={row.id}
                      id={row.id}
                      hidden={row.hidden}
                      showHidden={ui.showHidden}
                      installed={row.installed}
                      iconUrl={row.iconUrl}
                      title={row.title}
                      source={row.source}
                      tags={row.tags}
                      year={row.year}
                      url={row.url}
                    />
                  );
                }
                return out;
              })()
            ) : (
              derived.rowsSorted.map((row) => (
                <GameRow
                  key={row.id}
                  id={row.id}
                  hidden={row.hidden}
                  showHidden={ui.showHidden}
                  installed={row.installed}
                  iconUrl={row.iconUrl}
                  title={row.title}
                  source={row.source}
                  tags={row.tags}
                  year={row.year}
                  url={row.url}
                />
              ))
            )}
          </Table.Tbody>
        </Table>
      </Box>
    </Flex>
  );
}
