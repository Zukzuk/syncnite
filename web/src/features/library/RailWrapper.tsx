import React from "react";
import { Box } from "@mantine/core";
import { AlphabeticalRail } from "../../components/AlphabeticalRail";

type Props = {
  isVisible: boolean;
  activeLetter: string | null;
  counts: Record<string, number>;
  onJump: (letter: string) => void;
};

/**
 * RailWrapper component to conditionally render the AlphabeticalRail.
 * Props:
 * - isVisible: Whether the rail should be displayed.
 * - activeLetter: The currently active letter in the rail.
 * - counts: A record of counts for each letter.
 * - onJump: Callback when a letter is jumped to.
 */
export function RailWrapper({ isVisible, activeLetter, counts, onJump }: Props) {
  if (!isVisible) return null;
  return (
    <Box style={{ display: "flex", alignItems: "stretch", pointerEvents: "none" }}>
      <Box style={{ pointerEvents: "auto", width: "100%" }}>
        <AlphabeticalRail active={activeLetter} onJump={onJump} counts={counts} />
      </Box>
    </Box>
  );
}