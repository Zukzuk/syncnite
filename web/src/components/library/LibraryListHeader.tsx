import type { SortKey } from "../../lib/types";

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
          gridTemplateColumns: "56px minmax(0, 40%) 60px 80px minmax(200px, 1fr)",
          minWidth: "calc(56px + 40% + 60px + 80px + 200px + 24px)",
          alignItems: "center",
          gap: 12,
          height: 40,
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
