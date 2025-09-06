import React from "react";
import type { SortKey } from "../../lib/types";

export function VirtuosoHeader(props: {
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
        boxShadow: "0 1px 0 0 var(--mantine-color-default-border)",
      }}
    >
      <div
        className="library-header"
        style={{
          display: "grid",
          gridTemplateColumns: "56px minmax(0, 50%) 70px 70px minmax(200px, 1fr)",
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
