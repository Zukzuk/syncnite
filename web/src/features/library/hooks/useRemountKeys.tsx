import * as React from "react";

type useParams = {
  filteredCount: number;
  q: string;
  sources: string[];
  tags: string[];
  series: string[];
  showHidden: boolean;
  installedOnly: boolean;
  sortKey: string;
  sortDir: string;
};

type UseReturn = {
  groupedKey: string;
  flatKey: string;
};

/** Hook to generate remount keys for library views */
export function useRemountKeys({
  filteredCount, q, 
  sources, tags, series, showHidden,
  installedOnly, sortKey, sortDir
}: useParams): UseReturn {
  const dataSig = `${filteredCount}|${q}|${sources.join(",")}|${tags.join(",")}|${series.join(",")}|${showHidden}|${installedOnly}`;
  const groupedKey = `grp:${dataSig}|${sortKey}|${sortDir}`;
  const flatKey = `flt:${dataSig}|${sortKey}|${sortDir}`;
  return { groupedKey, flatKey };
}
