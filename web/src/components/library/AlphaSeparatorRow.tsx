import React from "react";
import { Table } from "@mantine/core";
import { SCROLLBAR_SIZE } from "./constants";

export function AlphaSeparatorRow({ bucket, top }: { bucket: string; top: number }) {
  return (
    <Table.Tr>
      <Table.Td
        colSpan={5}
        style={{
          position: "sticky",
          top,
          zIndex: 1, // below header (z=2) but above body
          background: "var(--mantine-color-body)",
          fontWeight: 700,
          borderTop: "1px solid var(--mantine-color-default-border)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          paddingRight: SCROLLBAR_SIZE,
        }}
      >
        {bucket}
      </Table.Td>
    </Table.Tr>
  );
}
