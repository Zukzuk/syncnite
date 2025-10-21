import { Box } from "@mantine/core";
import type { SortDir, SortKey } from "../../lib/types";
import { GRID, Z_INDEX } from "../../lib/constants";

type Props = {
  headerRef: (el: HTMLElement | null) => void;
  top: number;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggleSort: (k: SortKey) => void;
};

export function HeaderSort(props: Props) {
  const { headerRef, sortKey, sortDir, onToggleSort, top } = props;
  const label = (base: string, key: SortKey) =>
    sortKey === key ? `${base} ${sortDir === "asc" ? "▲" : "▼"}` : base;

  return (
    <Box style={{ position: "sticky", top, zIndex: Z_INDEX.stickyHeader }}>
      <div
        ref={headerRef}
        style={{
          background: "var(--mantine-color-body)",
          borderTop: "1px solid var(--mantine-color-default-border)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <div
          className="library-header"
          style={{
            display: "grid",
            gridTemplateColumns: GRID.cols,
            height: GRID.smallBox,
            alignItems: "center",
            gap: 12,
            fontWeight: 600,
            padding: "0 16px 0 12px",
          }}
        >
          <div />
          <div
            style={{ cursor: "pointer", textAlign: "left" }}
            onClick={() => onToggleSort("title")}
          >
            {label("Title", "title")}
          </div>
          <div
            style={{ cursor: "pointer", textAlign: "center" }}
            onClick={() => onToggleSort("year")}
          >
            {label("Year", "year")}
          </div>
          <div
            style={{ cursor: "pointer", textAlign: "center" }}
            onClick={() => onToggleSort("source")}
          >
            {label("Platform", "source")}
          </div>
          <div
            style={{ cursor: "pointer", textAlign: "left" }}
            onClick={() => onToggleSort("series")}
          >
            {label("Series", "series")}
          </div>
        </div>
      </div>
    </Box>
  );
}
