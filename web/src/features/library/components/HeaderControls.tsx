import { memo, useMemo } from "react";
import { Flex, Box, SegmentedControl, Group } from "@mantine/core";
import { LoadedData, SwitchesMode, UIControls, UIDerivedData, ViewMode } from "../../../types/types";
import { useInterLinkedTheme } from "../../../hooks/useInterLinkedTheme";
import { SearchInput } from "../../../components/SearchInput";
import { MultiSelectInput } from "../../../components/MultiSelectInput";
import { IconToggleWithLabel } from "../../../components/IconToggleWithLabel";
import { PLAYNITE_SOURCE_MAP } from "../../../services/PlayniteService";

type Props = {
  controlsRef: (el: HTMLDivElement | null) => void;
  libraryData: LoadedData;
  ui: UIControls;
  derived: UIDerivedData;
};

export const HeaderControls = memo(function HeaderControls({
  controlsRef,
  libraryData,
  ui,
  derived,
}: Props) {
  const { hasMenu, grid } = useInterLinkedTheme();
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

  const sourcesData = useMemo(
    () => Array.from(new Set(allSources)).sort().map((s) => ({ value: s, label: PLAYNITE_SOURCE_MAP[s]?.label ?? s })),
    [allSources]
  );

  const tagsData = useMemo(
    () => Array.from(new Set(allTags)).sort().map((t) => ({ value: t, label: PLAYNITE_SOURCE_MAP[t]?.label ?? t })),
    [allTags]
  );

  const seriesData = useMemo(
    () => Array.from(new Set(allSeries)).sort().map((s) => ({ value: s, label: s })),
    [allSeries]
  );

  return (
    <Box
      ref={controlsRef}
      aria-label="header-controls"
      style={{
        minHeight: grid.rowHeight,
        padding: grid.gap,
        paddingLeft: hasMenu ? grid.gap : grid.gap * 5,
      }}
    >
      <Flex
        direction="row"
        align="center"
        justify="space-between"
        wrap="wrap"
        style={{ width: "100%", height: "100%" }}
        gap={grid.gap}
      >
        <Group>
          <SearchInput 
            width={282}
            value={q} 
            onChange={setQ} 
          />
        </Group>

        <Group
          gap={grid.gap}
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
