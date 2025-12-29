import { memo, useMemo, useEffect } from "react";
import {
  Flex,
  Group,
  Slider,
  Drawer,
  ActionIcon,
  Stack,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFilter } from "@tabler/icons-react";

import {
  SwitchesMode,
  UIControls,
  UIDerivedData,
  ViewMode,
} from "../../../types/app";
import {
  InterLinkedData,
  InterLinkedGameItem,
  InterLinkedTheme,
} from "../../../types/interlinked";
import { PLAYNITE_SOURCE_MAP } from "../../../services/PlayniteService";
import { WrappedSegmentedControl } from "../../../components/WrappedSegmentedControl";
import { SearchInput } from "../../../components/SearchInput";
import { MultiSelectInput } from "../../../components/MultiSelectInput";
import { WrappedSwitch } from "../../../components/WrappedSwitch";

type Props = {
  theme: InterLinkedTheme;
  libraryData: InterLinkedData;
  ui: UIControls;
  derived: UIDerivedData;
};

export const HeaderControls = memo(function HeaderControls({
  libraryData,
  ui,
  derived,
  theme,
}: Props) {
  // Hardcoded to Playnite for now
  const { allSources, allTags, allSeries, items } = libraryData.playnite ?? {};
  if (!items) return null;

  const { grid, hasNavbar } = theme;

  const {
    view,
    setView,
    isListView,
    switches,
    setSwitches,
    resetAllFilters,
    sliderValue,
    setSliderValue,
    q,
    setQ,
    sources,
    setSources,
    tags,
    setTags,
    series,
    setSeries,
    showHidden,
    setShowHidden,
    installedOnly,
    setShowInstalledOnly,
  } = ui;

  const { filteredCount } = derived;

  const [drawerOpened, drawer] = useDisclosure(false);

  const hiddenCount = useMemo(() => {
    return items.reduce(
      (acc: number, it: InterLinkedGameItem) => acc + (it.isHidden ? 1 : 0),
      0
    );
  }, [items]);

  const baselineTotal = items.length - hiddenCount;

  const hasActiveFilters =
    (q?.trim()?.length ?? 0) > 0 ||
    (tags?.length ?? 0) > 0 ||
    (sources?.length ?? 0) > 0 ||
    (series?.length ?? 0) > 0 ||
    installedOnly === true ||
    showHidden === true; // baseline is false, so true means it's an active filter

  useEffect(() => {
    const desired: SwitchesMode = hasActiveFilters ? "enabled" : "disabled";
    if (switches !== desired) setSwitches(desired);
  }, [hasActiveFilters, switches, setSwitches]);

  const sourcesData = useMemo(
    () =>
      Array.from(new Set(allSources))
        .sort()
        .map((s) => ({
          value: s,
          label:
            PLAYNITE_SOURCE_MAP[s as keyof typeof PLAYNITE_SOURCE_MAP]?.label ??
            s,
        })),
    [allSources]
  );

  const tagsData = useMemo(
    () =>
      Array.from(new Set(allTags))
        .sort()
        .map((t) => ({
          value: t,
          label:
            PLAYNITE_SOURCE_MAP[t as keyof typeof PLAYNITE_SOURCE_MAP]?.label ??
            t,
        })),
    [allTags]
  );

  const seriesData = useMemo(
    () =>
      Array.from(new Set(allSeries))
        .sort()
        .map((s) => ({ value: s, label: s })),
    [allSeries]
  );

  const FiltersCountControl = (
    <WrappedSegmentedControl
      leftIsActive={hasActiveFilters}
      tooltip={{
        left: "Filters active! Click the right side to reset",
        right: "Nothing is filtered! Nothing to reset",
      }}
      label={{
        left: "filters active",
        right: "showing all items",
      }}
      readOnly={true}
      width={110}
      value={switches}
      data={[
        { value: "enabled", label: `${filteredCount}` },
        { value: "disabled", label: `${baselineTotal}` },
      ]}
      onChange={(next) => {
        const mode = next as SwitchesMode;
        if (mode === "enabled") return;
        resetAllFilters();
      }}
    />
  );

  return (
    <>
      {/* Drawer only used when !hasNavbar, to access the otherwise-hidden filters */}
      {!hasNavbar && (
        <Drawer
          opened={drawerOpened}
          onClose={drawer.close}
          title="Filters"
          position="right"
          size="xs"
        >
          <Stack gap="sm">
            <MultiSelectInput
              placeholder="Tags"
              group="playnite"
              data={tagsData}
              value={tags}
              setData={setTags}
            />

            <MultiSelectInput
              placeholder="Sources"
              group="playnite"
              data={sourcesData}
              value={sources}
              setData={setSources}
            />

            <MultiSelectInput
              placeholder="Series"
              group="playnite"
              data={seriesData}
              value={series}
              setData={setSeries}
            />

            <Divider />

            <Group justify="space-between">
              <WrappedSwitch
                label="installed"
                ariaLabel="Show installed only"
                checked={installedOnly}
                toggle={setShowInstalledOnly}
              />

              <WrappedSwitch
                label="hidden"
                ariaLabel="Show hidden"
                checked={showHidden}
                toggle={setShowHidden}
              />
            </Group>

            <Divider />

            {/* Optional: you can also expose the grid slider here when !hasNavbar */}
            <Slider
              step={1}
              size="sm"
              value={sliderValue}
              onChange={setSliderValue}
              defaultValue={grid.gridCardDefaultWidth}
              min={grid.gridCardMinWidth}
              max={grid.gridCardMaxWidth}
              marks={[
                { value: grid.gridCardMinWidth, label: "S" },
                { value: grid.gridCardDefaultWidth, label: "M" },
                { value: grid.gridCardMaxWidth, label: "L" },
              ]}
              styles={{
                root: { marginTop: 8 },
                markLabel: { fontSize: 10 },
                label: { fontSize: 10 },
              }}
            />
          </Stack>
        </Drawer>
      )}

      <Flex
        aria-label="header-controls"
        direction="row"
        align="center"
        wrap="nowrap"
        pl={hasNavbar ? grid.gap * 2 : grid.gapLg}
        pr={grid.gap * 2}
        style={{
          minWidth: grid.minSiteWidth,
          width: "100%",
          minHeight: grid.rowHeight,
        }}
      >
        {/* LEFT SIDE */}
        <Flex
          align="center"
          wrap={hasNavbar ? "wrap" : "nowrap"}
          style={{ flex: 1, minWidth: 0 }}
        >
          {hasNavbar ? (
            // --- Original hasNavbar layout (kept) ---
            <Group gap={4}>
              <Group>
                <WrappedSegmentedControl
                  leftIsActive={isListView}
                  value={view}
                  data={[
                    { value: "list", label: "List" },
                    { value: "grid", label: "Grid" },
                  ]}
                  onChange={(v) => setView(v as ViewMode)}
                />

                <Slider
                  w={160}
                  step={1}
                  size="sm"
                  value={sliderValue}
                  onChange={setSliderValue}
                  defaultValue={grid.gridCardDefaultWidth}
                  min={grid.gridCardMinWidth}
                  max={grid.gridCardMaxWidth}
                  marks={[
                    { value: grid.gridCardMinWidth, label: "S" },
                    { value: grid.gridCardDefaultWidth, label: "M" },
                    { value: grid.gridCardMaxWidth, label: "L" },
                  ]}
                  styles={{
                    root: { top: 7 },
                    markLabel: {
                      position: "relative",
                      top: -30,
                      fontSize: 10,
                    },
                    label: { fontSize: 10, top: -10 },
                  }}
                />

                <SearchInput
                  width={262}
                  value={q}
                  onChange={setQ}
                />
              </Group>

              <Group>
                <Group>
                  <MultiSelectInput
                    placeholder="Tags"
                    group="playnite"
                    data={tagsData}
                    value={tags}
                    setData={setTags}
                  />

                  <MultiSelectInput
                    placeholder="Sources"
                    group="playnite"
                    data={sourcesData}
                    value={sources}
                    setData={setSources}
                  />

                  <MultiSelectInput
                    placeholder="Series"
                    group="playnite"
                    data={seriesData}
                    value={series}
                    setData={setSeries}
                  />
                </Group>

                <Group>
                  <WrappedSwitch
                    label="installed"
                    ariaLabel="Show installed only"
                    checked={installedOnly}
                    toggle={setShowInstalledOnly}
                  />

                  <WrappedSwitch
                    label="hidden"
                    ariaLabel="Show hidden"
                    checked={showHidden}
                    toggle={setShowHidden}
                  />
                </Group>
              </Group>
            </Group>
          ) : (
            // --- !hasNavbar: search stretches between left & right segmented controls ---
            <Group gap="xs" wrap="nowrap" style={{ width: "100%", minWidth: 0 }}>
              <WrappedSegmentedControl
                leftIsActive={isListView}
                value={view}
                data={[
                  { value: "list", label: "List" },
                  { value: "grid", label: "Grid" },
                ]}
                onChange={(v) => setView(v as ViewMode)}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <SearchInput value={q} onChange={setQ} />
              </div>

              {/* Right-side controls stay to the right; search expands in between */}
              {FiltersCountControl}

              <ActionIcon
                variant="subtle"
                aria-label="Open filters"
                onClick={drawer.open}
              >
                <IconFilter size={18} />
              </ActionIcon>
            </Group>
          )}
        </Flex>

        {/* RIGHT SIDE (only when hasNavbar, keep original placement) */}
        {hasNavbar && (
          <Flex justify="flex-end" align="center" style={{ flex: 0, height: "100%" }}>
            <Group>{FiltersCountControl}</Group>
          </Flex>
        )}
      </Flex>
    </>
  );
});
