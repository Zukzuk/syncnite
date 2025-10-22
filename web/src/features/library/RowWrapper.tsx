import React, { useCallback } from "react";
import { Box, Collapse } from "@mantine/core";
import { GRID } from "../../lib/constants";
import { useDelayedFlag } from "../hooks/useDelayedFlag";
import { Row } from "../hooks/useLibrary";
import { RowItem } from "./RowItem";
import { RowDetails } from "./RowDetails";

type Props = Row &{
  topOffset: number;
  collapseOpen: boolean;
  everOpened: boolean;
  onToggle: () => void;
};

export function RowWrapper(props: Props) {
  const {
    id, isInstalled, coverUrl, bgUrl, title, isHidden,
    collapseOpen, everOpened, topOffset, onToggle,
  } = props;

  const collapseOpenDelayed = useDelayedFlag({ active: collapseOpen, delayMs: 140 });

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
      {/* Container */}
      <Box
        style={{ position: "relative", top: 0, left: 0, zIndex: 1 }}
        w={collapseOpen ? `calc(100vw - ${GRID.menuWidth}px - 12px - 15px)` : "100%"}
        h={collapseOpen ? `calc(100vh - ${topOffset}px - 38px - ${GRID.smallBox}px - 12px)` : "100%"}
      >
        {/* Row */}
        <RowItem
          {... props }
        />

        {/* Opened */}
        <Collapse in={collapseOpen} transitionDuration={140}>
          <RowDetails
            title={title}
            coverUrl={coverUrl}
            collapseOpenDelayed={collapseOpenDelayed}
            everOpened={everOpened}
            onToggle={onToggle}
          />
        </Collapse>
      </Box>

      {/* Background */}
      {collapseOpen && everOpened && bgUrl && (
        <Box
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            pointerEvents: "none",
            zIndex: 0,
            transform: collapseOpenDelayed ? "scale(1.02)" : "scale(1.01)",
            opacity: collapseOpenDelayed ? 0.4 : 0,
            willChange: "opacity, transform",
            transitionProperty: "opacity, transform",
            transitionDuration: "220ms, 260ms",
            transitionTimingFunction: "ease, ease",
          }}
        />
      )}

    </Box>
  );
}
