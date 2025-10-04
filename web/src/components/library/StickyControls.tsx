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
    showHidden: boolean; setShowHidden: (v: boolean) => void;
    installedOnly: boolean; setInstalledOnly: (v: boolean) => void;
  };
};

export function StickyControls({ controlsRef, filteredCount, totalCount, ui }: Props) {
  return (
    <Box
      ref={controlsRef as unknown as React.RefObject<HTMLDivElement>}
      p="md"
      style={{ position: "sticky", top: 0, zIndex: Z_INDEX.controls, background: "var(--mantine-color-body)" }}
    >
      <ControlsHeader
        q={ui.q}
        setQ={ui.setQ}
        sources={ui.sources}
        setSources={ui.setSources}
        allSources={ui.allSources}
        tags={ui.tags}
        setTags={ui.setTags}
        allTags={ui.allTags}
        showHidden={ui.showHidden}
        setShowHidden={ui.setShowHidden}
        installedOnly={ui.installedOnly}
        setInstalledOnly={ui.setInstalledOnly}
        filteredCount={filteredCount}
        totalCount={totalCount}
      />
    </Box>
  );
}
