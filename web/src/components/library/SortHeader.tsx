import type { SortKey } from "../../lib/types";
import { GRID } from "../../lib/constants";

export function SortHeader(props: {
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
          height: GRID.headerHeight,
          alignItems: "center",
          gap: 12,
          fontWeight: 600,
          padding: "0 16px 0 12px",
        }}
      >
        <div />
        <div style={{ cursor: "pointer", textAlign: "left" }} onClick={() => onToggleSort("title")}>{label("Title", "title")}</div>
        <div style={{ cursor: "pointer", textAlign: "center" }} onClick={() => onToggleSort("year")}>{label("Year", "year")}</div>
        <div style={{ cursor: "pointer", textAlign: "center" }} onClick={() => onToggleSort("source")}>{label("Platform", "source")}</div>
        <div style={{ cursor: "pointer", textAlign: "left" }} onClick={() => onToggleSort("tags")}>{label("Tags", "tags")}</div>
      </div>
    </div>
  );
}
