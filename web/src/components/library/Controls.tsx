import React from "react";
import { Group, MultiSelect, Switch, Text, TextInput, Stack, ActionIcon, Flex } from "@mantine/core";

export function Controls(props: {
  q: string; setQ: (v: string) => void;
  sources: string[]; setSources: (v: string[]) => void;
  tags: string[]; setTags: (v: string[]) => void;
  allSources: string[];
  allTags: string[];
  showHidden: boolean; setShowHidden: (v: boolean) => void;
  installedOnly: boolean; setInstalledOnly: (v: boolean) => void;
  filteredCount: number;
  totalCount: number;
}) {
  const {
    q, setQ,
    sources, setSources, allSources,
    tags, setTags, allTags,
    showHidden, setShowHidden,
    installedOnly, setInstalledOnly,
    filteredCount, totalCount,
  } = props;

  const searchIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
    </svg>
  );

  const clearIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />
    </svg>
  );

  const sourceData = React.useMemo(
    () => Array.from(new Set(allSources)).sort().map((s) => ({ value: s, label: s })),
    [allSources]
  );

  const tagData = React.useMemo(
    () => Array.from(new Set(allTags)).sort().map((t) => ({ value: t, label: t })),
    [allTags]
  );

  return (
    <Group justify="space-between" align="end" gap="sm" wrap="wrap">
      <Group gap="sm" wrap="wrap" align="end">
        <TextInput
          placeholder="Search titles, tags, sources…"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          w={495}
          size="sm"
          radius="xl"
          variant="filled"
          leftSection={searchIcon}
          rightSection={
            q ? (
              <ActionIcon
                size="sm"
                variant="subtle"
                aria-label="Clear search"
                onClick={() => setQ("")}
              >
                {clearIcon}
              </ActionIcon>
            ) : null
          }
        />
        <Group>
          <MultiSelect
            placeholder="All sources"
            value={sources}
            onChange={setSources}
            data={sourceData}
            clearable
            searchable
            w={240}
            size="sm"
            radius="xl"
            variant="filled"
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="No sources found"
            styles={{ pill: { display: "none" } }}
          />
          <MultiSelect
            placeholder="All tags"
            value={tags}
            onChange={setTags}
            data={tagData}
            clearable
            searchable
            w={240}
            size="sm"
            radius="xl"
            variant="filled"
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="No tags found"
            styles={{ pill: { display: "none" } }}
          />
        </Group>
      </Group>

      <Group gap="lg" align="end">
        <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
          <Text size="sm" className="is-dim" style={{ whiteSpace: "nowrap" }}>
            {totalCount ? `${filteredCount.toLocaleString()} / ${totalCount.toLocaleString()}` : ""}
          </Text>
        </Flex>
        <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
          <Switch
            aria-label="Installed only"
            checked={installedOnly}
            onChange={(e) => setInstalledOnly(e.currentTarget.checked)}
            size="sm"
          />
          <Text size="xs" className="is-dim">installed</Text>
        </Flex>
        <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
          <Switch
            aria-label="Show hidden"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.currentTarget.checked)}
            size="sm"
          />
          <Text size="xs" className="is-dim">hidden</Text>
        </Flex>
      </Group>
    </Group>
  );
}