import React from "react";
import { Flex, Box, SegmentedControl, Group } from "@mantine/core";
import { LoadedData, SwitchesMode, UIControls, UIDerivedData, ViewMode } from "../types/types";
import { getTheme } from "../theme";
import { SOURCE_MAP } from "../lib/constants";
import { SearchInput } from "./SearchInput";
import { MultiSelectInput } from "./MultiSelectInput";
import { IconToggleWithLabel } from "./IconToggleWithLabel";

type Props = {
  controlsRef: (el: HTMLDivElement | null) => void;
  libraryData: LoadedData;
  ui: UIControls;
  derived: UIDerivedData;
};

export const HeaderControls = React.memo(function HeaderControls({
  controlsRef,
  libraryData,
  ui,
  derived,
}: Props) {
  const { hasMenu, GRID } = getTheme();
  const { allSources, allTags, allSeries } = libraryData;

  const {
    view, setView,
    switches, setSwitches,
    q, setQ,
    sources, setSources,
    tags, setTags,
    series, setSeries,
    showHidden, setShowHidden,
    installedOnly, setShowInstalledOnly,
  } = ui;

  const { filteredCount, totalCount } = derived;

  const sourcesData = React.useMemo(
    () => Array.from(new Set(allSources)).sort().map((s) => ({ value: s, label: SOURCE_MAP[s]?.label ?? s })),
    [allSources]
  );

  const tagsData = React.useMemo(
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
      style={{
        minHeight: GRID.rowHeight,
        padding: GRID.gap,
        paddingLeft: hasMenu ? GRID.gap : GRID.gap * 5,
      }}
    >
      <Flex
        direction="row"
        align="center"
        justify="space-between"
        wrap="wrap"
        style={{ width: "100%", height: "100%" }}
        gap={GRID.gap}
      >
        <Group>
          <SearchInput 
            width={282}
            value={q} 
            onChange={setQ} 
          />
        </Group>

        <Group
          gap={GRID.gap}
          wrap="wrap"
        >
          <SegmentedControl
            value={switches}
            size="xs"
            radius="sm"
            w={110}
            color="var(--interlinked-color-primary)"
            onChange={(t) => setSwitches(t as SwitchesMode)}
            data={[
              { value: "enabled", label: `${filteredCount}` },
              { value: "disabled", label: `${totalCount}` },
            ]}
          />

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

          <IconToggleWithLabel
            label="installed"
            ariaLabel="Show installed only"
            checked={installedOnly}
            toggle={setShowInstalledOnly}
          />

          <IconToggleWithLabel
            label="hidden"
            ariaLabel="Show hidden"
            checked={showHidden}
            toggle={setShowHidden}
          />
        </Group>

        <Group
          gap={4}
          wrap="wrap"
        >
          <MultiSelectInput
            width={139}
            placeholder="Tags"
            group="playnite"
            data={tagsData}
            value={tags}
            setData={setTags}
          />

          <MultiSelectInput
            width={139}
            placeholder="Sources"
            group="playnite"
            data={sourcesData}
            value={sources}
            setData={setSources}
          />
        </Group>
      </Flex>

    </Box>
  );
});
