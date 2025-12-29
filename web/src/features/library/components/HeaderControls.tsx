import { memo, useMemo, useEffect } from "react";
import { Flex, Group, Slider } from "@mantine/core";
import { SwitchesMode, UIControls, UIDerivedData, ViewMode, } from "../../../types/app";
import { InterLinkedData, InterLinkedGameItem, InterLinkedTheme } from "../../../types/interlinked";
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
    view, setView,
    isListView,
    switches, setSwitches, resetAllFilters,
    sliderValue, setSliderValue,
    q, setQ,
    sources, setSources,
    tags, setTags,
    series, setSeries,
    showHidden, setShowHidden,
    installedOnly, setShowInstalledOnly,
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
    <Flex
      aria-label="header-controls"
      direction="row"
      align="center" // vertical middle for the whole row
      wrap="nowrap" // only the left part wraps
      pl={hasNavbar ? grid.gap * 2 : grid.gapLg}
      pr={grid.gap * 2}
      style={{ width: "100%", minHeight: grid.rowHeight }}
    >
      <Flex
        align="center"
        wrap="wrap"
        style={{ flex: 1, minWidth: 0 }} // minWidth:0 allows wrapping/shrinking
      >
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

            {hasNavbar &&
              <Slider
                w={160}
                step={1}
                size="sm"
                value={sliderValue}
                onChange={setSliderValue}
                defaultValue={grid.cardDefaultWidth}
                min={grid.cardMinWidth}
                max={grid.cardMaxWidth}
                marks={[
                  { value: grid.cardMinWidth, label: "S" },
                  { value: grid.cardDefaultWidth, label: "M" },
                  { value: grid.cardMaxWidth, label: "L" },
                ]}
                styles={{
                  root: { top: 7 },
                  markLabel: { position: "relative", top: -30, fontSize: 10 },
                  label: { fontSize: 10, top: -10 },
                }}
              />
            }

            <SearchInput width={262} value={q} onChange={setQ} />
          </Group>

          {hasNavbar &&
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
          }
        </Group>
      </Flex>

      {hasNavbar &&
        <Flex
          justify="flex-end"
          align="center"
          style={{ flex: 0, height: "100%" }}
        >
          <Group>
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
          </Group>
        </Flex>
      }
    </Flex>
  );
});
