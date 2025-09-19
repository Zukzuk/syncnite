import React from "react";
import { Group, MultiSelect, Switch, Text, Stack, Flex } from "@mantine/core";
import { SearchInput } from "../ui/SearchInput";

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

  const sourceData = React.useMemo(
    () => Array.from(new Set(allSources)).sort().map((s) => ({ value: s, label: s })),
    [allSources]
  );

  const tagData = React.useMemo(
    () => Array.from(new Set(allTags)).sort().map((t) => ({ value: t, label: t })),
    [allTags]
  );

  return (
    <Group wrap="wrap" align="center" gap="sm">

      <Group
        gap="sm"
        wrap="wrap"
        style={{ flex: '1 1 0%', minWidth: 0 }}
      >
        <Group align="end" wrap="wrap">
          <Stack gap="xs" style={{ flex: 1 }}>
            <SearchInput value={q} onChange={setQ} />
          </Stack>
        </Group>

        <Group gap="sm" align="end" wrap="nowrap" style={{ flex: '0 0 auto' }}>
          <MultiSelect
            placeholder="All sources"
            value={sources}
            onChange={setSources}
            data={sourceData}
            clearable
            searchable
            w={230}          // keep fixed width
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
            w={230}
            size="sm"
            radius="xl"
            variant="filled"
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="No tags found"
            styles={{ pill: { display: "none" } }}
          />
        </Group>
      </Group>

      <Group
        gap="sm"
        wrap="wrap"
        align="center"
        justify="flex-end"
        ml="auto"
        style={{ flex: '0 0 auto' }}
      >
        <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
          <Text size="sm" className="is-dim" p="0 0 10 0" style={{ whiteSpace: "nowrap" }}>
            {totalCount ? `${filteredCount.toLocaleString()} / ${totalCount.toLocaleString()}` : ""}
          </Text>

          <Flex direction="row" align="center" justify="center" wrap="nowrap" style={{ alignSelf: "stretch" }}>
            <Group gap="sm" align="end" wrap="nowrap">
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
          </Flex>
        </Flex>
      </Group>
    </Group>
  );
}
