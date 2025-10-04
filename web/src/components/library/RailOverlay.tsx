import React from "react";
import { Box } from "@mantine/core";
import { AlphabeticalRail } from "../ui/AlphabeticalRail";

type Props = {
  isVisible: boolean;
  activeLetter: string | null;
  counts: Record<string, number>;
  onJump: (letter: string) => void;
};

export function AlphabetRailOverlay({ isVisible, activeLetter, counts, onJump }: Props) {
  if (!isVisible) return null;
  return (
    <Box style={{ display: "flex", alignItems: "stretch", pointerEvents: "none" }}>
      <Box style={{ pointerEvents: "auto", width: "100%" }}>
        <AlphabeticalRail active={activeLetter} onJump={onJump} counts={counts} />
      </Box>
    </Box>
  );
}