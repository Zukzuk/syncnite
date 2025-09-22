import React from "react";
import {
  Stack,
  Group,
  Card,
  Text,
  Table,
  Badge,
  Code,
  Alert,
  Divider,
  Anchor,
  Loader,
  List,
} from "@mantine/core";
import { loadLibrary } from "../lib/data";
import { effectiveLink } from "../lib/utils";
import type { Loaded, Row, Link as PnLink } from "../lib/types";

function SampleValue({ row, field }: { row: Row; field: keyof Row }) {
  const v = row[field] as any;
  if (v == null) return <Text className="is-dim">null</Text>;
  if (Array.isArray(v)) return <Code>{v.slice(0, 5).join(", ")}{v.length > 5 ? " …" : ""}</Code>;
  if (typeof v === "object") return <Text className="is-dim">(object)</Text>;
  return <Code>{String(v)}</Code>;
}

/**
 * Settings page that reflects the discrete "app data interface" we actually use.
 *
 * It uses the normalized Row shape from web/src/lib/types.ts and shows:
 * - The exact fields the app reads from each game (Row)
 * - Example values pulled from your current data
 * - Where those values originate in the dumped Playnite JSON (brief hint)
 * - A JSON preview of the first Row for quick validation
 * - Plus a helper section for *derived/UI* values like the play/install action link and platform links.
 */
export default function SettingsPage() {
  const [data, setData] = React.useState<Loaded | null>(null);

  React.useEffect(() => {
    (async () => setData(await loadLibrary()))();
  }, []);

  const sample: Row | null = data?.rows?.[0] ?? null;
  const primaryHref = sample ? (sample.url ?? effectiveLink({ url: sample.url, source: sample.source, title: sample.title, tags: sample.tags })) : null;
  const actionHref = sample ? `playnite://playnite/start/${encodeURIComponent(sample.id)}` : null;

  // NOTE: This list mirrors the Row type from web/src/lib/types.ts.
  // If you add/remove a field on Row, update this array.
  const FIELDS: Array<{
    key: keyof Row;
    type: string;
    desc: string;
    sourceHint?: string;
  }> = [
      { key: "id", type: "string (GUID)", desc: "Stable game identifier used for keys and Play actions.", sourceHint: "Game.Id / _id" },
      { key: "title", type: "string", desc: "Display title.", sourceHint: "Game.Name" },
      { key: "sortingName", type: "string", desc: "Used only for alphabetical sort + buckets.", sourceHint: "Game.SortingName || Game.Name" },
      { key: "source", type: "string", desc: "Store / launcher name shown as Source column and filter.", sourceHint: "Game.SourceId → sources.*.Name" },
      { key: "tags", type: "string[]", desc: "Tags badges and filtering.", sourceHint: "Game.TagIds → tags.*.Name" },
      { key: "hidden", type: "boolean", desc: "Controls visibility and dimming in UI.", sourceHint: "Game.Hidden" },
      { key: "installed", type: "boolean", desc: "Highlights row and toggles Play / Install overlay.", sourceHint: "Game.IsInstalled" },
      { key: "year", type: "number | null", desc: "Derived release year (used for sorting and display).", sourceHint: "ReleaseYear/ReleaseDate/Ticks → year" },
      { key: "url", type: "string | null", desc: "Primary external link for the game title.", sourceHint: "Game.Links (best guess) or source-specific template" },
      { key: "iconUrl", type: "string", desc: "Icon used in grid; ICOs are converted to PNG on demand.", sourceHint: "Game.Icon / IconId → /data/libraryfiles" },
    ];

  return (
    <Stack gap="lg" p="md">
      <Text fz={24} fw={700}>Settings</Text>

      <Alert variant="light" color="gray" title="About this page">
        This page reflects the exact <em>normalized</em> data shape the app uses—the
        <Code>Row</Code> type from <Code>web/src/lib/types.ts</Code>. It pulls a sample from your current import so you can verify
        values and quickly spot mapping issues.
      </Alert>

      {!data ? (
        <Loader size="sm" />
      ) : (
        <>
          <Card withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={600}>Game data fields (Row)</Text>
              <Badge variant="light">{data.rows.length.toLocaleString()} games</Badge>
            </Group>
            <Table striped highlightOnHover verticalSpacing="xs" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 160 }}>Field</Table.Th>
                  <Table.Th style={{ width: 160 }}>Type</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th style={{ width: 260 }}>Source (hint)</Table.Th>
                  <Table.Th style={{ width: 260 }}>Example</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {FIELDS.map((f) => (
                  <Table.Tr key={String(f.key)}>
                    <Table.Td><Code>{String(f.key)}</Code></Table.Td>
                    <Table.Td><Code>{f.type}</Code></Table.Td>
                    <Table.Td>{f.desc}</Table.Td>
                    <Table.Td className="is-dim">{f.sourceHint ?? "—"}</Table.Td>
                    <Table.Td>
                      {sample ? (
                        <SampleValue row={sample} field={f.key} />
                      ) : (
                        <Text className="is-dim">—</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>

          <Card withBorder>
            <Text fw={600} mb="xs">Derived links & actions (UI)</Text>
            <Text size="sm" className="is-dim" mb="sm">
              These aren’t stored on <Code>Row</Code> but are derived at render time.
            </Text>
            <Divider my="sm" />
            <List spacing="xs" size="sm">
              <List.Item>
                <Text>
                  <b>Title link</b>: {primaryHref ? <Anchor href={primaryHref} target="_blank" rel="noopener">{primaryHref}</Anchor> : <span className="is-dim">(none)</span>}
                  <span className="is-dim"> (from <Code>row.url</Code> or <Code>effectiveLink()</Code>)</span>
                </Text>
              </List.Item>
              <List.Item>
                <Text>
                  <b>Play/Install action</b>: {actionHref ? <Anchor href={actionHref}>{actionHref}</Anchor> : <span className="is-dim">(—)</span>}
                  <span className="is-dim"> (computed as <Code>playnite://playnite/start/{"${row.id}"}</Code>)</span>
                </Text>
              </List.Item>
            </List>
          </Card>

          <Card withBorder>
            <Text fw={600} mb="xs">Filters & Facets</Text>
            <Text size="sm" className="is-dim">
              The Library view builds filters from <Code>Loaded.allSources</Code> and <Code>Loaded.allTags</Code>.
            </Text>
            <Divider my="sm" />
            <Group align="start" gap="xl">
              <div>
                <Text fw={600} mb={6}>Sources</Text>
                <Group gap="xs">
                  {data.allSources.length ? data.allSources.map((s) => (
                    <Badge key={s} variant="outline">{s}</Badge>
                  )) : <Text className="is-dim">(none)</Text>}
                </Group>
              </div>
              <div>
                <Text fw={600} mb={6}>Tags</Text>
                <Group gap="xs">
                  {data.allTags.length ? data.allTags.slice(0, 50).map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  )) : <Text className="is-dim">(none)</Text>}
                </Group>
                {data.allTags.length > 50 && (
                  <Text size="xs" className="is-dim" mt={6}>+{data.allTags.length - 50} more…</Text>
                )}
              </div>
            </Group>
          </Card>

          <Card withBorder>
            <Text fw={600} mb="xs">Sample Row (JSON)</Text>
            <Text size="sm" className="is-dim" mb="sm">
              The first game from your current dataset, as consumed by the app.
            </Text>
            <Code block>
              {JSON.stringify(sample ?? {}, null, 2)}
            </Code>
          </Card>

          <Card withBorder>
            <Text fw={600} mb="xs">Docs & Sources</Text>
            <Text size="sm">
              • Normalization: <Code>web/src/lib/data.ts → loadLibrary()</Code><br />
              • Types: <Code>web/src/lib/types.ts → Row, Loaded</Code><br />
              • Link heuristics: <Code>web/src/lib/utils.ts → effectiveLink()</Code><br />
              • UI Play overlay: <Code>web/src/components/library/GameRow.tsx</Code>
            </Text>
            <Text size="sm" mt="sm" className="is-dim">
              Edit this page to add custom fields later. It is intentionally data-driven and safe to
              ship in production as a self-documenting contract.
            </Text>
          </Card>
        </>
      )}
    </Stack>
  );
}