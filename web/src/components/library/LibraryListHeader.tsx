import type { SortKey } from "../../lib/types";
import { GRID } from "../../lib/constants";

export function LibraryListHeader(props: {
  headerRef: (el: HTMLElement | null) => void;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onToggleSort: (k: SortKey) => void;
}) {
  const { headerRef, sortKey, sortDir, onToggleSort } = props;
  const label = (base: string, key: SortKey) => (sortKey === key ? `${base} ${sortDir === "asc" ? "▲" : "▼"}` : base);

  return (
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
          minWidth: GRID.minWidth,
          alignItems: "center",
          gap: 12,
          height: GRID.headerHeight,
          fontWeight: 600,
          padding: "0 12px",
        }}
      >
        <div />
        <div style={{ cursor: "pointer" }} onClick={() => onToggleSort("title")}>{label("Title", "title")}</div>
        <div style={{ cursor: "pointer" }} onClick={() => onToggleSort("year")}>{label("Year", "year")}</div>
        <div style={{ cursor: "pointer" }} onClick={() => onToggleSort("source")}>{label("Source", "source")}</div>
        <div style={{ cursor: "pointer" }} onClick={() => onToggleSort("tags")}>{label("Tags", "tags")}</div>
      </div>
    </div>
  );
}
