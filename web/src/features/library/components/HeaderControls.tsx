import { memo, useMemo, useEffect, useCallback } from "react";
import { Flex, Box, SegmentedControl, Group, Text, Tooltip } from "@mantine/core";
import { SwitchesMode, UIControls, UIDerivedData, ViewMode, } from "../../../types/app";
import { SearchInput } from "../../../components/SearchInput";
import { MultiSelectInput } from "../../../components/MultiSelectInput";
import { IconToggleWithLabel } from "../../../components/IconToggleWithLabel";
import { PLAYNITE_SOURCE_MAP } from "../../../services/PlayniteService";
import { InterLinkedData, InterLinkedGameItem, InterLinkedTheme } from "../../../types/interlinked";

type Props = {
  controlsRef: (el: HTMLDivElement | null) => void;
  theme: InterLinkedTheme;
  libraryData: InterLinkedData;
  ui: UIControls;
  derived: UIDerivedData;
};

export const HeaderControls = memo(function HeaderControls({
  controlsRef,
  libraryData,
  ui,
  derived,
  theme,
}: Props) {
  // Hardcoded to Playnite for now
  const { allSources, allTags, allSeries, items } = libraryData.playnite ?? {};
  if (!items) return null;
  
  const { hasNavbar, grid } = theme;

  const {
    view,
    setView,
    switches,
    setSwitches,
    resetAllFilters,
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

  const hiddenCount = useMemo(() => {
    return items.reduce((acc: number, it: InterLinkedGameItem) => acc + (it.isHidden ? 1 : 0), 0);
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
        .map((s) => ({ value: s, label: PLAYNITE_SOURCE_MAP[s as keyof typeof PLAYNITE_SOURCE_MAP]?.label ?? s })),
    [allSources]
  );

  const tagsData = useMemo(
    () =>
      Array.from(new Set(allTags))
        .sort()
        .map((t) => ({ value: t, label: PLAYNITE_SOURCE_MAP[t as keyof typeof PLAYNITE_SOURCE_MAP]?.label ?? t })),
    [allTags]
  );

  const seriesData = useMemo(
    () =>
      Array.from(new Set(allSeries))
        .sort()
        .map((s) => ({ value: s, label: s })),
    [allSeries]
  );

  return (
    <Box
      ref={controlsRef}
      aria-label="header-controls"
      style={{
        minHeight: grid.rowHeight,
        padding: grid.gap,
        paddingLeft: hasNavbar ? grid.gap : grid.gap * 5,
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
        </Group>

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

          {<MultiSelectInput
            placeholder="Series"
            group="playnite"
            data={seriesData}
            value={series}
            setData={setSeries}
          />}
        </Group>

        <Group>
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

        <Group>
          <Flex
            direction="column"
            align="center"
            justify="center"
            style={{ alignSelf: "stretch" }}
          >
            <Tooltip
              label={
                hasActiveFilters
                  ? "Filters active! Click the right side to reset"
                  : "Nothing is filtered! Nothing to reset"
              }
              withArrow
              position="bottom"
              style={{ fontSize: 10 }}
            >
              <SegmentedControl
                value={switches}
                size="xs"
                radius="sm"
                w={110}
                color="var(--interlinked-color-primary)"
                onChange={(next) => {
                  const mode = next as SwitchesMode;

                  // enabled = indicator only
                  if (mode === "enabled") return;

                  // disabled = reset
                  resetAllFilters();
                }}
                readOnly={switches === "enabled" ? false : true}
                data={[
                  { value: "enabled", label: `${filteredCount}` },
                  { value: "disabled", label: `${baselineTotal}` },
                ]}
              />
            </Tooltip>
            <Text c="dimmed" style={{ fontSize: 10 }}>
              {hasActiveFilters ? "filters active" : "showing all items"}
            </Text>
          </Flex>
        </Group>

      </Flex>
    </Box>
  );
});
