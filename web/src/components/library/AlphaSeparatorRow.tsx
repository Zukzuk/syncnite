import React from "react";

export function AlphaSeparatorRow({ bucket, top }: { bucket: string; top: number }) {
  return (
    <div
      className="alpha-separator"
      style={{
        position: "sticky",
        top,
        zIndex: 5,
        background: "var(--mantine-color-body)",
        fontWeight: 700,
        borderTop: "1px solid var(--mantine-color-default-border)",
        borderBottom: "1px solid var(--mantine-color-default-border)",
        padding: "6px 12px",
      }}
    >
      {bucket}
    </div>
  );
}
