import React from "react";
import { Badge, Group, NumberFormatter, Select, Switch, Text, TextInput, Title } from "@mantine/core";

export function Controls(props: {
  q: string; setQ: (v: string) => void;
  source: string | null; setSource: (v: string | null) => void; sources: string[];
  tag: string | null; setTag: (v: string | null) => void; tags: string[];
  showHidden: boolean; setShowHidden: (v: boolean) => void;
  filteredCount: number; totalCount: number;
}) {
  const { q, setQ, source, setSource, tag, setTag, showHidden, setShowHidden, filteredCount, totalCount, sources, tags } = props;

  return (
    <Group justify="space-between" align="center" mb="xs" wrap="wrap">
      <Title order={2} fw={700}>Library</Title>
      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Search titles / tags / source…"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          w={320}
        />
        <Select
          placeholder="All sources"
          value={source}
          onChange={setSource}
          data={sources.map((s) => ({ value: s, label: s }))}
          clearable w={180}
        />
        <Select
          placeholder="All tags"
          value={tag}
          onChange={setTag}
          data={tags.map((t) => ({ value: t, label: t }))}
          clearable w={220}
        />
        <Switch
          checked={showHidden}
          onChange={(e) => setShowHidden(e.currentTarget.checked)}
          label="Show hidden"
        />
        <Text c="dimmed">
          <NumberFormatter value={filteredCount} thousandSeparator /> /
          <NumberFormatter value={totalCount} thousandSeparator />
        </Text>
      </Group>
    </Group>
  );
}
