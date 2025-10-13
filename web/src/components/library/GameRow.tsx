import React, { useMemo, useCallback } from "react";
import { Box, Collapse } from "@mantine/core";
import { useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { buildAssetUrl, effectiveLink } from "../../lib/utils";
import { GRID } from "../../lib/constants";
import { GameRowItem } from "../ui/GameRowItem";
import { GameRowDetails } from "../ui/GameRowDetails";
import { useDelayedFlag } from "../hooks/useDelayedFlag";
import { Row } from "../hooks/useLibrary";

type ControlledProps = {
  topOffset: number;
  collapseOpen: boolean;
  everOpened: boolean;
  onToggle: () => void;
};

export function GameRow(props: Row & ControlledProps) {
  const {
    id, hidden, sortingName, installed, iconUrl, 
    title, source, tags, year, url, gameId, raw,
    collapseOpen, everOpened, topOffset, onToggle,
  } = props;

  const dim = hidden;
  const href = useMemo(
    () => url ?? effectiveLink({ url, source, title, tags }),
    [url, source, title, tags]
  );

  const cover = (raw as any)?.CoverImage ?? null;
  const bg = (raw as any)?.BackgroundImage ?? null;
  const coverUrl = useMemo(() => buildAssetUrl(cover), [cover]);
  const bgUrl = useMemo(() => buildAssetUrl(bg), [bg]);
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
      className={`game-row${dim ? " is-dim" : ""}${installed ? " is-installed" : ""}`}
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
        backgroundColor: installed ? "var(--mantine-primary-color-light)" : "transparent",
      }}
      onClick={onToggle}
    >
      {/* Foreground */}
      <Box
        style={{ position: "relative", top: 0, left: 0, zIndex: 1 }}
        w={collapseOpen ? `calc(100vw - ${GRID.menuWidth}px - 12px - 15px)` : "100%"}
        h={collapseOpen ? `calc(100vh - ${topOffset}px - 38px - ${GRID.smallBox}px - 12px)` : "100%"}
      >
        {/* Main item */}
        <GameRowItem
          id={id}
          gameId={gameId}
          installed={installed}
          iconUrl={iconUrl}
          title={title}
          year={year}
          source={source}
          tags={tags}
          raw={raw}
          href={href}
          dim={dim}
          sortingName={sortingName}
          hidden={hidden}
          url={url}
          collapseOpen={collapseOpen}
        />

        {/* Details */}
        <Collapse in={collapseOpen} transitionDuration={140}>
          <GameRowDetails
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
