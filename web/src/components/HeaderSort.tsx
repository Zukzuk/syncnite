import React from "react";
import { Box, UnstyledButton, Text } from "@mantine/core";
import { SortKey, UIControls } from "../types/types";
import { GRID } from "../lib/constants";
import { getTheme } from "../theme";

type Props = {
  sortRef: (el: HTMLElement | null) => void;
  ui: UIControls;
};

// Header sort component for the library view.
export const HeaderSort = React.memo(function HeaderSort({
  sortRef,
  ui,
}: Props) {
  const { sortKey, sortDir, onToggleSort, isListView } = ui;
  const { isDark } = getTheme();

  const label = (base: string, key: SortKey) =>
    sortKey === key ? `${base} ${sortDir === "asc" ? "▲" : "▼"}` : base;

  return (
    <Box
      ref={sortRef}
      aria-label="header-sort"
      style={{
        position: "relative",
        background: "var(--mantine-color-body)",
        height: GRID.halfRowHeight,
        padding: `0 ${GRID.scrollbarWidth}px 0 ${GRID.listLeftPadding}px`,
      }}
    >
      <Box
        style={{
          display: "grid",
          alignItems: "center",
          height: "100%",
          gridTemplateColumns: isListView ? GRID.colsList : GRID.colsGrid,
          gap: GRID.gap,
          fontWeight: 400,
        }}
        role="row"
      >
        {/* spacer column */}
        <Box role="columnheader" aria-hidden="true" />

        <UnstyledButton
          onClick={() => onToggleSort("title")}
          role="columnheader"
          aria-label="Sort by Title"
          style={{ textAlign: "left", cursor: "pointer" }}
        >
          <Text 
            c={sortKey === "title" ? "var(--interlinked-color-primary)" : undefined} 
            style={{ fontSize: 14 }}
          >
            {label("Title", "title")}
          </Text>
        </UnstyledButton>

        <UnstyledButton
          onClick={() => onToggleSort("year")}
          role="columnheader"
          aria-label="Sort by Year"
          style={{ textAlign: "center", cursor: "pointer" }}

        >
          <Text 
            c={sortKey === "year" ? "var(--interlinked-color-primary)" : undefined} 
            style={{ fontSize: 14 }}
          >
            {label("Year", "year")}
          </Text>
        </UnstyledButton>

        <UnstyledButton
          onClick={() => onToggleSort("source")}
          role="columnheader"
          aria-label="Sort by Platform"
          style={{ textAlign: "center", cursor: "pointer" }}
        >
          <Text 
            c={sortKey === "source" ? "var(--interlinked-color-primary)" : undefined} 
            style={{ fontSize: 14 }}
          >
            {label("Platform", "source")}
          </Text>
        </UnstyledButton>

        <UnstyledButton
          onClick={() => onToggleSort("series")}
          role="columnheader"
          aria-label="Sort by Series"
          style={{ textAlign: "left", cursor: "pointer" }}
        >
          <Text 
            c={sortKey === "series" ? "var(--interlinked-color-primary)" : undefined} 
            style={{ fontSize: 14 }}
          >
            {label("Series", "series")}
          </Text>
        </UnstyledButton>
      </Box>
    </Box>
  );
});
