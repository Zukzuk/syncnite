import React from "react";
import { Group, MultiSelect, Switch, Text, Flex, Box, SegmentedControl } from "@mantine/core";
import { SearchInput } from "../../../components/SearchInput";
import { GRID, SOURCE_MAP } from "../../../lib/constants";
import { LoadedData, SwitchesMode, UIControls, UIDerivedData, ViewMode } from "../../../types/types";

type Props = {
  controlsRef: (el: HTMLDivElement | null) => void;
  libraryData: LoadedData;
  ui: UIControls;
  derived: UIDerivedData;
};

// Header controls component for filtering and view options in the library.
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
    switches, setSwitches,
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
      aria-label="header-controls"
      p="xs"
      style={{
        minHeight: GRID.rowHeight,
        borderBottom: `1px solid var(--mantine-color-default-border)`,
      }}
    >
      <Flex
        direction="row"
        align="center"
        justify="space-between"
        style={{ width: "100%", height: "100%" }}
      >
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

        <SearchInput value={q} onChange={setQ} />

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

        <SegmentedControl
          value={switches}
          size="xs"
          radius="sm"
          color="var(--interlinked-color-primary)"
          onChange={(t) => setSwitches(t as SwitchesMode)}
          data={[
            { value: 'enabled', label: `${filteredCount.toString()}` },
            { value: 'disabled', label: `${totalCount.toString()}` },
          ]}
        />

        <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
          <Switch
            aria-label="Installed only"
            checked={installedOnly}
            onChange={(e) => setInstalledOnly(e.currentTarget.checked)}
            size="xs"
            radius="md"
            pb={4}
          />
          <Text size="xs" c="dimmed">installed</Text>
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
          <Text size="xs" c="dimmed">hidden</Text>
        </Flex>
      </Flex>
    </Box >
  );
});
