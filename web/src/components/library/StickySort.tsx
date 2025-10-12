import React from "react";
import { Box } from "@mantine/core";
import { SortHeader } from "../ui/SortHeader";
import { Z_INDEX } from "../../lib/constants";
import { SortDir, SortKey } from "../../lib/types";

type Props = {
  headerRef: (el: HTMLElement | null) => void;
  top: number;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggleSort: (key: SortKey) => void;
};

export function StickySort({ headerRef, top, sortKey, sortDir, onToggleSort }: Props) {
  return (
    <Box style={{ position: "sticky", top, zIndex: Z_INDEX.stickyHeader }}>
      <SortHeader
        headerRef={headerRef as unknown as (el: HTMLElement | null) => void}
        sortKey={sortKey}
        sortDir={sortDir}
        onToggleSort={onToggleSort}
      />
    </Box>
  );
}
