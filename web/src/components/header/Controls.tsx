import React from "react";
import { Flex, Group, Select, Switch, Text, TextInput, Stack, ActionIcon } from "@mantine/core";

export function Controls(props: {
  q: string; setQ: (v: string) => void;
  source: string | null; setSource: (v: string | null) => void; sources: string[];
  tag: string | null; setTag: (v: string | null) => void; tags: string[];
  showHidden: boolean; setShowHidden: (v: boolean) => void;
  installedOnly: boolean; setInstalledOnly: (v: boolean) => void;
}) {
  const {
    q, setQ,
    source, setSource, sources,
    tag, setTag, tags,
    showHidden, setShowHidden,
    installedOnly, setInstalledOnly,
  } = props;

  const leftIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
    </svg>
  );

  const clearIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />
    </svg>
  );

  return (
    <Group justify="space-between" align="end" gap="sm" wrap="wrap">
      <Group gap="sm" wrap="wrap" align="end">
        <TextInput
          placeholder="Search titles, tags, sources…"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          w={360}
          size="sm"
          radius="xl"
          variant="filled"
          leftSection={leftIcon}
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
          <Select
            placeholder="All sources"
            value={source}
            onChange={setSource}
            data={sources.map((s) => ({ value: s, label: s }))}
            clearable
            w={200}
            size="sm"
            radius="xl"
            variant="filled"
            comboboxProps={{ withinPortal: true }}
          />
          <Select
            placeholder="All tags"
            value={tag}
            onChange={setTag}
            data={tags.map((t) => ({ value: t, label: t }))}
            clearable
            w={240}
            size="sm"
            radius="xl"
            variant="filled"
            comboboxProps={{ withinPortal: true }}
          />
        </Group>
      </Group>

      <Flex
        align="center"
      >
        <Group gap="lg" align="end">
          <Stack gap={2} align="center">
            <Switch
              aria-label="Installed only"
              checked={installedOnly}
              onChange={(e) => setInstalledOnly(e.currentTarget.checked)}
              size="sm"
            />
            <Text size="xs" c="dimmed">Installed</Text>
          </Stack>
          <Stack gap={2} align="center">
            <Switch
              aria-label="Show hidden"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.currentTarget.checked)}
              size="sm"
            />
            <Text size="xs" c="dimmed">Hidden</Text>
          </Stack>
        </Group>
      </Flex>
    </Group>
  );
}
