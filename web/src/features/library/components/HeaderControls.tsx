import React from "react";
import { Group, MultiSelect, Switch, Text, Flex, Box, SegmentedControl } from "@mantine/core";
import { SearchInput } from "../../../components/SearchInput";
import { GRID, SOURCE_MAP } from "../../../lib/constants";
import { LoadedData, UIControls, UIDerivedData, ViewMode } from "../../../types/types";

type Props = {
  controlsRef: (el: HTMLDivElement | null) => void;
  libraryData: LoadedData;
  ui: UIControls;
  derived: UIDerivedData;
};

/**
 * Header controls component for the library view.
 * Includes search, filters, view mode toggle, and item counts.
 * Props:
 * - controlsRef: Ref callback for the header element. 
 * - libraryData: Loaded library data including all sources, tags, and series.
 * - ui: UI state including search query, filters, and toggles.
 * - derived: Derived UI state including filtered and total item counts.
 */
export const HeaderControls = React.memo(function HeaderControls({
  controlsRef,
  libraryData,
  ui,
  derived,
}: Props) {

  const {
    allSources,
    allTags,
    allSeries
  } = libraryData;

  const {
    view, setView,
    q, setQ,
    sources, setSources,
    tags, setTags,
    series, setSeries,
    showHidden, setShowHidden,
    installedOnly, setInstalledOnly,

  } = ui;

  const {
    filteredCount,
    totalCount,
  } = derived;

  const sourceData = React.useMemo(
    () => Array.from(new Set(allSources)).sort().map((s) => ({ value: s, label: SOURCE_MAP[s]?.label ?? s })),
    [allSources]
  );

  const tagData = React.useMemo(
    () => Array.from(new Set(allTags)).sort().map((t) => ({ value: t, label: SOURCE_MAP[t]?.label ?? t })),
    [allTags]
  );

  const seriesData = React.useMemo(
    () => Array.from(new Set(allSeries)).sort().map((s) => ({ value: s, label: s })),
    [allSeries]
  );

  return (
    <Box
      ref={controlsRef}
      p="xs"
      style={{
        minHeight: GRID.rowHeight,
        borderBottom: `1px solid var(--mantine-color-default-border)`,
      }}
    >
      <Group wrap="wrap" align="center" gap="sm">

        <Group
          gap="xs"
          wrap="wrap"
          style={{ flex: '1 1 0%', minWidth: 0 }}
        >
          <Group align="end" wrap="wrap" >
            <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
              <SegmentedControl
                value={view}
                size="xs"
                radius="sm"
                color="var(--interlinked-color-primary)"
                onChange={(v) => setView(v as ViewMode)}
                data={[
                  { value: "list", label: "List" },
                  { value: "grid", label: "Grid" },
                ]}
              />
            </Flex>
            <SearchInput value={q} onChange={setQ} />
          </Group>

          <Group gap="sm" align="end" wrap="nowrap" style={{ flex: '0 0 auto' }}>
            <MultiSelect
              w={150}
              size="xs"
              radius="sm"
              placeholder="Platforms"
              value={sources}
              onChange={setSources}
              data={sourceData}
              variant={sources.length ? "filled" : "default"}
              nothingFoundMessage="No sources found"
              clearable
              styles={{ pill: { display: "none" as const } }}
            />
            <MultiSelect
              w={150}
              size="xs"
              radius="sm"
              placeholder="Tags"
              value={tags}
              onChange={setTags}
              data={tagData}
              variant={tags.length ? "filled" : "default"}
              nothingFoundMessage="No tags found"
              clearable
              styles={{ pill: { display: "none" as const } }}
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
          <Flex direction="row" align="center" justify="center" wrap="nowrap" style={{ alignSelf: "stretch" }}>
            <Text size="xs" pr="sm" style={{ whiteSpace: "nowrap" }}>
              {totalCount ? `${filteredCount.toLocaleString()} / ${totalCount.toLocaleString()}` : ""}
            </Text>
            <Group gap="sm" align="end" wrap="nowrap">
              <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
                <Switch
                  aria-label="Installed only"
                  checked={installedOnly}
                  onChange={(e) => setInstalledOnly(e.currentTarget.checked)}
                  size="xs"
                  radius="md"
                  pb={4}
                />
                <Text size="xs">installed</Text>
              </Flex>
              <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
                <Switch
                  aria-label="Show hidden"
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.currentTarget.checked)}
                  size="xs"
                  radius="md"
                  pb={4}
                />
                <Text size="xs">hidden</Text>
              </Flex>
            </Group>
          </Flex>
        </Group>
      </Group>
    </Box >
  );
});
