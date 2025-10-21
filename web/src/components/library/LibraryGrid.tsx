import * as React from "react";
import { Box, Card, Image, Text } from "@mantine/core";
import { VirtuosoGrid, type VirtuosoGridHandle } from "react-virtuoso";
import { Scroller } from "../ui/Scroller"; // re-use our custom scroller
import type { Row } from "../hooks/useLibrary";

export type CoverGridProps = {
    rows: Row[];
    /** Optional ref if parent wants to imperatively scroll */
    virtuosoRef?: React.RefObject<VirtuosoGridHandle>;
    /** Optional remount key if caller wants to force a reset on data-shape changes */
    remountKey?: string;
    /** Used to bust cache on installed flags if you want to re-key items */
    installedUpdatedAt?: string | null;
};

export default function LibraryGrid({ rows, virtuosoRef, remountKey, installedUpdatedAt }: CoverGridProps) {
    // Container & item wrappers as recommended by react-virtuoso for grid layouts
    const List = React.useMemo(
        () =>
            React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
                <div
                    {...props}
                    ref={ref}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: 8,
                        padding: 8,
                        alignContent: "start",
                        height: "100%",
                        boxSizing: "border-box",
                        ...(props.style || {}),
                    }}
                />
            )),
        []
    );
    List.displayName = "CoverGridList";

    const Item = React.useMemo(
        () =>
            React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
                <div {...props} ref={ref} style={{ ...(props.style || {}) }} />
            )),
        []
    );
    Item.displayName = "CoverGridItem";

    return (
        <VirtuosoGrid
            ref={virtuosoRef as any}
            key={remountKey}
            style={{ height: "100%" }}
            totalCount={rows.length}
            components={{ Scroller, List, Item }}
            computeItemKey={(index) => `${rows[index].id}|${installedUpdatedAt ?? ""}`}
            itemContent={(index) => <CoverCard row={rows[index]} />}
            increaseViewportBy={{ top: 600, bottom: 800 }}
        />
    );
}

// Minimal Mantine Card for a single cover — kept intentionally bare.
function CoverCard({ row }: { row: Row }) {
    const src = row.coverUrl || row.iconUrl || "";
    return (
        <Card withBorder p={2} radius="sm">
            <div style={{ position: "relative", aspectRatio: "23 / 32" }}>
                <Image
                    src={src}
                    alt={row.title}
                    fit="cover"
                    loading="lazy"
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                    }}
                />
            </div>
            <Text size="sm" m={6} lineClamp={2} title={row.title} fw={600} h={40}>
                {row.title}
            </Text>
            {row.year && (
                <Text m={6} mt={0} style={{ fontSize: 13 }}>{row.year}</Text>
            )}
        </Card>
    );
}
