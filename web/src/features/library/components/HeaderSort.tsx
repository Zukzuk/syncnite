import React from "react";
import { Box, UnstyledButton, Text } from "@mantine/core";
import { SortDir, SortKey } from "../../../types/types";
import { GRID } from "../../../lib/constants";

type Props = {
  sortRef: (el: HTMLElement | null) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  isListView: boolean;
  hasOpenItemInView?: boolean;
  onToggleSort: (k: SortKey) => void;
};

/**
 * Header sort component for the library view.
 * Renders sortable column headers for Title, Year, Platform, and Series.
 * Props:
 * - sortRef: Ref callback for the header element.
 * - sortKey: Current sort key.
 * - sortDir: Current sort direction.
 * - onToggleSort: Callback to toggle sorting by a given key.
 * - gridColumns: CSS grid template columns for layout.
 */
export const HeaderSort = React.memo(function HeaderSort(props: Props) {
  const { sortRef, sortKey, sortDir, isListView, hasOpenItemInView, onToggleSort } = props;

  const label = (base: string, key: SortKey) =>
    sortKey === key ? `${base} ${sortDir === "asc" ? "▲" : "▼"}` : base;

  // For a11y: map to aria-sort values
  const ariaSort = (key: SortKey): React.AriaAttributes["aria-sort"] =>
    sortKey !== key ? "none" : sortDir === "asc" ? "ascending" : "descending";

  return (
    <Box
      ref={sortRef}
      style={{
        position: "relative",
        background: "var(--mantine-color-body)",
        borderBottom: `1px solid var(--mantine-color-default-border)`,
        height: GRID.halfRowHeight,
        padding: `0 ${GRID.scrollbarWidth}px 0 ${GRID.listLeftPadding}px`,
      }}
    >
      <Box
        style={{
          display: "grid",
          alignItems: "center",
          height: "100%",
          gridTemplateColumns: (isListView || hasOpenItemInView) ? GRID.colsList : GRID.colsGrid,
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
          aria-sort={ariaSort("title")}
          aria-label="Sort by Title"
          style={{ textAlign: "left", cursor: "pointer" }}
        >
          <Text size="sm" fw={400}>{label("Title", "title")}</Text>
        </UnstyledButton>

        <UnstyledButton
          onClick={() => onToggleSort("year")}
          role="columnheader"
          aria-sort={ariaSort("year")}
          aria-label="Sort by Year"
          style={{ textAlign: "center", cursor: "pointer" }}
        >
          <Text size="sm" fw={400}>{label("Year", "year")}</Text>
        </UnstyledButton>

        <UnstyledButton
          onClick={() => onToggleSort("source")}
          role="columnheader"
          aria-sort={ariaSort("source")}
          aria-label="Sort by Platform"
          style={{ textAlign: "center", cursor: "pointer" }}
        >
          <Text size="sm" fw={400}>{label("Platform", "source")}</Text>
        </UnstyledButton>

        <UnstyledButton
          onClick={() => onToggleSort("series")}
          role="columnheader"
          aria-sort={ariaSort("series")}
          aria-label="Sort by Series"
          style={{ textAlign: "left", cursor: "pointer" }}
        >
          <Text size="sm" fw={400}>{label("Series", "series")}</Text>
        </UnstyledButton>
      </Box>
    </Box>
  );
});
