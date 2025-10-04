import React, { useMemo, useCallback } from "react";
import { Box, Collapse } from "@mantine/core";
import { useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { ANIM } from "../../lib/constants";
import { Row } from "../../lib/types";
import { buildAssetUrl, effectiveLink } from "../../lib/utils";
import { useDelayedFlag } from "../hooks/useDelayedFlag";
import { GameRowItem } from "../ui/GameRowItem";
import { GameRowDetails } from "../ui/GameRowDetails";

import "./GameRow.scss";

type ControlledProps = {
  isOpen: boolean;
  everOpened: boolean;
  onToggle: () => void;
};

export function GameRow(props: Row & ControlledProps) {
  const {
    id, hidden, sortingName, installed, iconUrl, title, source, tags, year, url, raw,
    isOpen, everOpened, onToggle,
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
  const bgOn = useDelayedFlag(isOpen, ANIM.wallpaperDelayMs);

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
      aria-expanded={isOpen}
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
      }}
      onClick={onToggle}
    >
      {/* Background */}
      {isOpen && everOpened && bgUrl && (
        <>
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
              transform: bgOn ? "scale(1.03)" : "scale(1.01)",
              opacity: bgOn ? 0.5 : 0,
              willChange: "opacity, transform",
              transitionProperty: "opacity, transform",
              transitionDuration: "220ms, 220ms",
              transitionTimingFunction: "ease, ease",
            }}
          />
          <Box
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              opacity: bgOn ? 1 : 0,
              pointerEvents: "none",
              zIndex: 0,
              transition: `opacity 220ms ease`,
            }}
          />
        </>
      )}

      {/* Foreground */}
      <Box style={{ position: "relative", zIndex: 1 }}>
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
          collapseOpen={isOpen}
        />

        <Collapse in={isOpen} transitionDuration={ANIM.collapseMs}>
          <GameRowDetails
            title={title}
            coverUrl={coverUrl}
            bgOn={bgOn}
            everOpened={everOpened}
          />
        </Collapse>
      </Box>
    </Box>
  );
}
