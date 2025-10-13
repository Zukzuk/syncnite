import React from "react";
import { Group, MultiSelect, Switch, Text, Stack, Flex, Button, Popover } from "@mantine/core";
import { SearchInput } from "./SearchInput";
import { SOURCE_LABEL_MAP } from "../../lib/constants";

type Props = {
  q: string; setQ: (v: string) => void;
  sources: string[]; setSources: (v: string[]) => void;
  tags: string[]; setTags: (v: string[]) => void;
  allSources: string[];
  allTags: string[];
  showHidden: boolean; setShowHidden: (v: boolean) => void;
  installedOnly: boolean; setInstalledOnly: (v: boolean) => void;
  filteredCount: number;
  totalCount: number;
};

export function ControlsHeader(props: Props) {
  const {
    q, setQ,
    sources, setSources, allSources,
    tags, setTags, allTags,
    showHidden, setShowHidden,
    installedOnly, setInstalledOnly,
    filteredCount, totalCount,
  } = props;

  const sourceData = React.useMemo(
    () => Array.from(new Set(allSources)).sort().map((s) => ({ value: s, label: SOURCE_LABEL_MAP[s] })),
    [allSources]
  );

  const tagData = React.useMemo(
    () => Array.from(new Set(allTags)).sort().map((t) => ({ value: t, label: t })),
    [allTags]
  );

  return (
    <Group wrap="wrap" align="center" gap="sm">

      <Group
        gap="xs"
        wrap="wrap"
        style={{ flex: '1 1 0%', minWidth: 0 }}
      >
        <Group align="end" wrap="wrap">
          <Stack gap="xs" style={{ flex: 1 }}>
            <SearchInput value={q} onChange={setQ} />
          </Stack>
        </Group>

        <Group gap="sm" align="end" wrap="nowrap" style={{ flex: '0 0 auto' }}>
          <Popover width={200} position="bottom" withArrow>
            <Popover.Target>
              <Button>Platforms</Button>
            </Popover.Target>
            <Popover.Dropdown p={0}>
              <MultiSelect
                placeholder="All platforms"
                value={sources}
                onChange={setSources}
                data={sourceData}
                clearable
                comboboxProps={{ withinPortal: false }}
                nothingFoundMessage="No sources found"
                styles={{ pill: { display: "none" } }}
              />
            </Popover.Dropdown>
          </Popover>

          <Popover width={200} position="bottom" withArrow>
            <Popover.Target>
              <Button>Tags</Button>
            </Popover.Target>
            <Popover.Dropdown p={0}>
              <MultiSelect
                placeholder="All tags"
                value={tags}
                onChange={setTags}
                data={tagData}
                clearable
                comboboxProps={{ withinPortal: false }}
                nothingFoundMessage="No tags found"
                styles={{ pill: { display: "none" } }}
              />
            </Popover.Dropdown>
          </Popover>
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
        <Flex direction="row" align="center" justify="center" wrap="nowrap" style={{ alignSelf: "stretch" }}>
          <Text size="sm" className="is-dim" pr="sm" style={{ whiteSpace: "nowrap" }}>
            {totalCount ? `${filteredCount.toLocaleString()} / ${totalCount.toLocaleString()}` : ""}
          </Text>
          <Group gap="sm" align="end" wrap="nowrap">
            <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
              <Switch
                aria-label="Installed only"
                checked={installedOnly}
                onChange={(e) => setInstalledOnly(e.currentTarget.checked)}
                size="sm"
                pb={4}
              />
              <Text size="xs" className="is-dim">installed</Text>
            </Flex>
            <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
              <Switch
                aria-label="Show hidden"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.currentTarget.checked)}
                size="sm"
                pb={4}
              />
              <Text size="xs" className="is-dim">hidden</Text>
            </Flex>
          </Group>
        </Flex>
      </Group>
    </Group>
  );
}
