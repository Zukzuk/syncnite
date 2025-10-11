import * as React from "react";
import { KeyDeps } from "../../lib/types";

export function useRemountKeys(d: KeyDeps) {
  const dataSig = `${d.filteredCount}|${d.q}|${d.sources.join(",")}|${d.tags.join(",")}|${d.showHidden}|${d.installedOnly}`;
  const groupedKey = `grp:${dataSig}|${d.sortKey}|${d.sortDir}`;
  const flatKey = `flt:${dataSig}|${d.sortKey}|${d.sortDir}`;
  return { groupedKey, flatKey };
}
