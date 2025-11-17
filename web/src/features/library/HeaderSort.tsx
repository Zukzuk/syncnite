import { Box, Paper, UnstyledButton, Text, useMantineTheme, rem } from "@mantine/core";
import type { SortDir, SortKey } from "../../lib/types";
import { GRID, Z_INDEX } from "../../lib/constants";

type Props = {
  headerRef: (el: HTMLElement | null) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggleSort: (k: SortKey) => void;
  gridColumns?: string;
};

/**
 * Header sort component for the library view.
 * Renders sortable column headers for Title, Year, Platform, and Series.
 * Props:
 * - headerRef: Ref callback for the header element.
 * - sortKey: Current sort key.
 * - sortDir: Current sort direction.
 * - onToggleSort: Callback to toggle sorting by a given key.
 * - gridColumns: CSS grid template columns for layout.
 */
export function HeaderSort(props: Props) {
  const { headerRef, sortKey, sortDir, onToggleSort, gridColumns } = props;
  const theme = useMantineTheme();

  const label = (base: string, key: SortKey) =>
    sortKey === key ? `${base} ${sortDir === "asc" ? "▲" : "▼"}` : base;

  // For a11y: map to aria-sort values
  const ariaSort = (key: SortKey): React.AriaAttributes["aria-sort"] =>
    sortKey !== key ? "none" : sortDir === "asc" ? "ascending" : "descending";

  return (
    <Box pos="relative" style={{ zIndex: Z_INDEX.stickyHeader }}>
      <Paper
        ref={headerRef}
        radius={0}
        withBorder
        style={{
          background: "var(--mantine-color-body)",
          borderTop: `1px solid var(--mantine-color-default-border)`,
          borderBottom: `1px solid var(--mantine-color-default-border)`,
          borderLeft: "none",
          borderRight: "none",
        }}
      >
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            height: GRID.smallBox,
            alignItems: "center",
            gap: rem(12),
            padding: `0 ${rem(16)} 0 ${rem(12)}`,
            fontWeight: 600,
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
            <Text fw={600}>{label("Title", "title")}</Text>
          </UnstyledButton>

          <UnstyledButton
            onClick={() => onToggleSort("year")}
            role="columnheader"
            aria-sort={ariaSort("year")}
            aria-label="Sort by Year"
            style={{ textAlign: "center", cursor: "pointer" }}
          >
            <Text fw={600}>{label("Year", "year")}</Text>
          </UnstyledButton>

          <UnstyledButton
            onClick={() => onToggleSort("source")}
            role="columnheader"
            aria-sort={ariaSort("source")}
            aria-label="Sort by Platform"
            style={{ textAlign: "center", cursor: "pointer" }}
          >
            <Text fw={600}>{label("Platform", "source")}</Text>
          </UnstyledButton>

          <UnstyledButton
            onClick={() => onToggleSort("series")}
            role="columnheader"
            aria-sort={ariaSort("series")}
            aria-label="Sort by Series"
            style={{ textAlign: "left", cursor: "pointer" }}
          >
            <Text fw={600}>{label("Series", "series")}</Text>
          </UnstyledButton>
        </Box>
      </Paper>
    </Box>
  );
}
