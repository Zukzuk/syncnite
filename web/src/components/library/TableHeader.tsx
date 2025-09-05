import React from "react";
import { Table } from "@mantine/core";
import type { SortKey } from "../../lib/types";
import { SCROLLBAR_SIZE } from "./constants";

export function TableHeader(props: {
  theadRef: React.RefObject<HTMLTableSectionElement>;
  headerHeight: number;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onToggleSort: (k: SortKey) => void;
}) {
  const { theadRef, sortKey, sortDir, onToggleSort } = props;

  const label = (base: string, key: SortKey) =>
    sortKey === key ? `${base} ${sortDir === "asc" ? "▲" : "▼"}` : base;

  return (
    <Table.Thead
      ref={theadRef}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 2,
        background: "var(--mantine-color-body)",
        boxShadow: "0 1px 0 0 var(--mantine-color-default-border)",
      }}
    >
      <Table.Tr>
        <Table.Th w={56} pr={SCROLLBAR_SIZE}></Table.Th>
        <Table.Th pr={SCROLLBAR_SIZE} onClick={() => onToggleSort("title")} style={{ cursor: "pointer" }}>
          {label("Title", "title")}
        </Table.Th>
        <Table.Th w={90} pr={SCROLLBAR_SIZE} onClick={() => onToggleSort("year")} style={{ cursor: "pointer" }}>
          {label("Year", "year")}
        </Table.Th>
        <Table.Th pr={SCROLLBAR_SIZE} onClick={() => onToggleSort("source")} style={{ cursor: "pointer" }}>
          {label("Source", "source")}
        </Table.Th>
        <Table.Th pr={SCROLLBAR_SIZE} onClick={() => onToggleSort("tags")} style={{ cursor: "pointer" }}>
          {label("Tags", "tags")}
        </Table.Th>
      </Table.Tr>
    </Table.Thead>
  );
}
