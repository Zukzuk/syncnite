import React from "react";
import { Box } from "@mantine/core";
import { Z_INDEX } from "../../lib/constants";
import { ControlsHeader } from "../ui/ControlsHeader";

type Props = {
  controlsRef: (el: HTMLElement | null) => void;
  filteredCount: number;
  totalCount: number;
  ui: {
    q: string; setQ: (v: string) => void;
    sources: string[]; setSources: (v: string[]) => void; allSources: string[];
    tags: string[]; setTags: (v: string[]) => void; allTags: string[];
    series: string[]; setSeries: (v: string[]) => void; allSeries: string[];
    showHidden: boolean; setShowHidden: (v: boolean) => void;
    installedOnly: boolean; setInstalledOnly: (v: boolean) => void;
  };
};

export function StickyControls({ controlsRef, filteredCount, totalCount, ui }: Props) {
  return (
    <Box
      ref={controlsRef as unknown as React.RefObject<HTMLDivElement>}
      p="sm"
      style={{ position: "sticky", top: 0, zIndex: Z_INDEX.controls, background: "var(--mantine-color-body)" }}
    >
      <ControlsHeader
        { ...ui }
        filteredCount={filteredCount}
        totalCount={totalCount}
      />
    </Box>
  );
}
