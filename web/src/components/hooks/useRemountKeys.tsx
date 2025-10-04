import * as React from "react";

type KeyDeps = {
  filteredCount: number;
  q: string;
  sources: string[];
  tags: string[];
  showHidden: boolean;
  installedOnly: boolean;
  sortKey: string;
  sortDir: string;
};

export function useRemountKeys(d: KeyDeps) {
  const dataSig = `${d.filteredCount}|${d.q}|${d.sources.join(",")}|${d.tags.join(",")}|${d.showHidden}|${d.installedOnly}`;
  const groupedKey = `grp:${dataSig}|${d.sortKey}|${d.sortDir}`;
  const flatKey = `flt:${dataSig}|${d.sortKey}|${d.sortDir}`;
  return { groupedKey, flatKey };
}
