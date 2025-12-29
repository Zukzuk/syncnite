import { memo } from "react";
import { Box, UnstyledButton, Text } from "@mantine/core";
import { SortKey, UIControls } from "../../../types/app";
import { InterLinkedTheme } from "../../../types/interlinked";

type Props = {
  theme: InterLinkedTheme;
  ui: UIControls;
};

// Header sort component for the library view.
export const HeaderSort = memo(function HeaderSort({
  ui,
  theme,
}: Props) {
  const { sortKey, sortDir, onToggleSort, isListView } = ui;
  const { hasNavbar, grid, isWidescreen, isDesktop } = theme;

  const label = (base: string, key: SortKey) =>
    sortKey === key ? `${base} ${sortDir === "asc" ? "▲" : "▼"}` : base;

  const cols = isListView
    ? `40px minmax(0, 1fr) 60px 80px ${isWidescreen ? "300px" : isDesktop ? "150px" : "0px"}`
    : "0px 60px 60px 80px 60px";

  return (
    <Box
      aria-label="header-sort"
      style={{
        position: "relative",
        background: "var(--interlinked-color-body)",
        height: grid.halfRowHeight,
        padding: `0 ${grid.scrollbarWidth}px 0 ${grid.listLeftPadding}px`,
      }}
    >
      <Box
        style={{
          display: "grid",
          alignItems: "center",
          height: "100%",
          gridTemplateColumns: cols,
          gap: grid.gap,
          fontWeight: 400,
        }}
        role="row"
      >
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
          style={{ textAlign: isListView ? "center" : "left", cursor: "pointer" }}

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
          aria-label="Sort by Source"
          style={{ textAlign: isListView ? "center" : "left", cursor: "pointer" }}
        >
          <Text
            c={sortKey === "source" ? "var(--interlinked-color-primary)" : undefined}
            style={{ fontSize: 14 }}
          >
            {label("Source", "source")}
          </Text>
        </UnstyledButton>

        {hasNavbar && (
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
        )}
      </Box>
    </Box>
  );
});
