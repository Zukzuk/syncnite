import React, { useCallback } from "react";
import { Box } from "@mantine/core";
import { GRID } from "../../lib/constants";
import { Row } from "../hooks/useLibrary";
import { RowItem } from "./RowItem";
import { RowDetails } from "./RowDetails";
import { RowBackground } from "./RowBackground";

type Props = Row & {
  topOffset: number;
  collapseOpen: boolean;
  everOpened: boolean;
  onToggle: () => void;
  isGroupedList: boolean;
};

export function RowWrapper(props: Props) {
  const {
    id, isInstalled, coverUrl, bgUrl, title, isHidden,
    collapseOpen, everOpened, topOffset, onToggle, isGroupedList,
  } = props;

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  return (
    <Box
      data-row-id={id}
      className={`game-row${isHidden ? " is-dim" : ""}${isInstalled ? " is-installed" : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={collapseOpen}
      aria-label={`${title} row`}
      onKeyDown={onKeyDown}
      style={{
        borderBottom: "1px solid var(--mantine-color-default-border)",
        cursor: "pointer",
        userSelect: "none",
        paddingLeft: 12,
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        transition: "background-color 140ms ease",
        backgroundColor: isInstalled ? "var(--mantine-primary-color-light)" : "transparent",
      }}
      onClick={onToggle}
    >
      <Box
        style={{ position: "relative", top: 0, left: 0, zIndex: 1 }}
        w={collapseOpen ? `calc(100vw - ${GRID.menuWidth}px - 12px - 15px)` : "100%"}
        h={collapseOpen ? `calc(100vh - ${topOffset}px ${isGroupedList ? "- 38px" : ""} - ${GRID.smallBox}px - 12px)` : "100%"}
      >
        <RowItem {...props} />
        <RowDetails title={title} coverUrl={coverUrl} collapseOpen={collapseOpen} everOpened={everOpened} onToggle={onToggle} />
      </Box>
      <RowBackground bgUrl={bgUrl} collapseOpen={collapseOpen} everOpened={everOpened} />
    </Box>
  );
}
