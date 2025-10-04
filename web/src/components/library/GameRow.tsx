import React, { useMemo, useCallback } from "react";
import { Box, Collapse } from "@mantine/core";
import { useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { Row } from "../../lib/types";
import { buildAssetUrl, effectiveLink } from "../../lib/utils";
import { useDelayedFlag } from "../hooks/useDelayedFlag";
import { GameRowItem } from "../ui/GameRowItem";
import { GameRowDetails } from "../ui/GameRowDetails";

type ControlledProps = {
  collapseOpen: boolean;
  everOpened: boolean;
  onToggle: () => void;
};

export function GameRow(props: Row & ControlledProps) {
  const {
    id, hidden, sortingName, installed, iconUrl, title, source, tags, year, url, raw,
    collapseOpen, everOpened, onToggle,
  } = props;

  const theme = useMantineTheme();
  useComputedColorScheme("light", { getInitialValueInEffect: true }); // if needed by your theme

  const dim = hidden;
  const href = useMemo(
    () => url ?? effectiveLink({ url, source, title, tags }),
    [url, source, title, tags]
  );

  const cover = (raw as any)?.CoverImage ?? null;
  const bg = (raw as any)?.BackgroundImage ?? null;
  const coverUrl = useMemo(() => buildAssetUrl(cover), [cover]);
  const bgUrl = useMemo(() => buildAssetUrl(bg), [bg]);
  const collapseOpenDelayed = useDelayedFlag(collapseOpen, 140);

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
        backgroundColor: installed ? "var(--mantine-primary-color-light) !important" : "auto",
      }}
      onClick={onToggle}
    >
      {/* Foreground */}
      <Box style={{ position: "relative", zIndex: 1 }}>

        {/* Main item */}
        <GameRowItem
          id={id}
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
