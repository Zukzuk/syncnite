import React from "react";
import { Group, MultiSelect, Switch, Text, Stack, Flex, rem, Box, SegmentedControl } from "@mantine/core";
import { SearchInput } from "../../components/SearchInput";
import { SOURCE_MAP, Z_INDEX } from "../../lib/constants";
import { getTheme } from "../../lib/utils";
import { ViewMode } from "../../lib/types";

type Props = {
  controlsRef: (el: HTMLElement | null) => void;
  q: string; setQ: (v: string) => void;
  sources: string[]; setSources: (v: string[]) => void;
  tags: string[]; setTags: (v: string[]) => void;
  series: string[]; setSeries: (v: string[]) => void;
  view: ViewMode; setView: (view: ViewMode) => void;
  allSources: string[];
  allTags: string[];
  allSeries: string[];
  showHidden: boolean; setShowHidden: (v: boolean) => void;
  installedOnly: boolean; setInstalledOnly: (v: boolean) => void;
  filteredCount: number;
  totalCount: number;
};

/**
 * Header controls component for the library view.
 * Includes search, filters, view mode toggle, and item counts.
 * Props:
 * - controlsRef: Ref callback for the container element.
 * - q, setQ: Search query state and setter.
 * - sources, setSources: Selected platforms state and setter.
 * - tags, setTags: Selected tags state and setter.
 * - series, setSeries: Selected series state and setter.
 * - view, setView: Current view mode and setter.
 * - allSources: All available platforms.
 * - allTags: All available tags.
 * - allSeries: All available series.
 * - showHidden, setShowHidden: Show hidden items state and setter.
 * - installedOnly, setInstalledOnly: Installed only state and setter.
 * - filteredCount: Number of items after filtering.
 * - totalCount: Total number of items.
 */
export function HeaderControls(props: Props) {
  const {
    q, setQ, controlsRef,
    view, setView,
    sources, setSources, allSources,
    tags, setTags, allTags,
    series, setSeries, allSeries,
    showHidden, setShowHidden,
    installedOnly, setInstalledOnly,
    filteredCount, totalCount,
  } = props;

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

  const { theme } = getTheme();

  return (
    <Box
      ref={controlsRef as unknown as React.RefObject<HTMLDivElement>}
      p="sm"
      style={{ position: "sticky", top: 0, zIndex: Z_INDEX.controls, background: "var(--mantine-color-body)" }}
    >
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
            <MultiSelect
              w={150}
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
              placeholder="Tags"
              value={tags}
              onChange={setTags}
              data={tagData}
              variant={tags.length ? "filled" : "default"}
              nothingFoundMessage="No tags found"
              clearable
              styles={{ pill: { display: "none" as const } }}
            />
            <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
              <SegmentedControl
                value={view}
                onChange={(v) => setView(v as ViewMode)}
                data={[
                  { value: "list", label: "List" },
                  { value: "grid", label: "Grid" },
                ]}
              />
            </Flex>
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
            <Text size="sm" pr="sm" style={{ whiteSpace: "nowrap" }}>
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
                <Text size="xs">installed</Text>
              </Flex>
              <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
                <Switch
                  aria-label="Show hidden"
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.currentTarget.checked)}
                  size="sm"
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
}
