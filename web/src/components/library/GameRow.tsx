import React from "react";
import {
  Badge,
  Box,
  Group,
  Text,
  Collapse,
  Image,
  Paper,
  Anchor,
  Flex,
  useMantineTheme, useComputedColorScheme,
  AspectRatio
} from "@mantine/core";
import { IconImage } from "../ui/IconImage";
import { PlayActionOverlay } from "../ui/PlayActionOverlay";
import { GRID, sourceTrim, BASE, ANIM } from "../../lib/constants";
import {
  effectiveLink,
  playniteAction,
  sourceProtocolLink,
  normalizePath,
} from "../../lib/utils";
import { Row } from "../../lib/types";
import { IconExternalLink } from "../../lib/icons";

import "./GameRow.scss";

type ControlledProps = {
  isOpen: boolean;
  everOpened: boolean;
  onToggle: () => void;
};

function buildAssetUrl(rel?: string | null): string | null {
  if (!rel) return null;
  const norm = normalizePath(rel);
  if (!norm) return null;
  if (/^https?:\/\//i.test(norm)) return norm;
  const path = norm.startsWith("libraryfiles/") ? norm : `libraryfiles/${norm}`;
  return `${BASE}/${path}`;
}

export function GameRow(props: Row & ControlledProps) {
  const { id, hidden, installed, iconUrl, title, source, tags, year, url, raw, isOpen, everOpened, onToggle } = props;
  const href = url ?? effectiveLink({ url, source, title, tags });
  const dim = hidden;

  const theme = useMantineTheme();
  const scheme = useComputedColorScheme("light", { getInitialValueInEffect: true });

  // Background image state
  const [bgOn, setBgOn] = React.useState(false);
  React.useEffect(() => {
    if (isOpen) {
      const t = window.setTimeout(() => setBgOn(true), ANIM.wallpaperDelayMs);
      return () => window.clearTimeout(t);
    }
    setBgOn(false);
  }, [isOpen]);

  // Contents
  const coverRel = (raw as any)?.CoverImage ?? (raw as any)?.BackgroundImage ?? null;
  const coverUrl = buildAssetUrl(coverRel);
  const bgRel = (raw as any)?.BackgroundImage ?? null;
  const bgUrl = buildAssetUrl(bgRel);
  const descriptionHtml: string | null =
    typeof (raw as any)?.Description === "string" ? (raw as any).Description : null;

  return (
    <Box
      data-row-id={id}
      className={`game-row${dim ? " is-dim" : ""}${installed ? " is-installed" : ""}`}
      role="button"
      aria-expanded={isOpen}
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

      {/* foreground */}
      <Box style={{ position: "relative", zIndex: 1 }}>
        {/* Header row */}
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: GRID.cols,
            alignItems: "center",
            gap: 12,
            height: GRID.rowHeight,
          }}
        >
          {/* First column: icon */}
          <Flex align="center" gap={8} style={{ width: GRID.rowHeight }} className={dim ? " is-dim" : ""}>
            <Box className="icon-wrap" style={{ position: "relative", width: GRID.smallBox, height: GRID.smallBox }}>
              <PlayActionOverlay installed={installed} href={playniteAction(id)} title={title}>
                <Box className="icon-base">
                  <IconImage src={iconUrl} />
                </Box>
              </PlayActionOverlay>
            </Box>
          </Flex>

          {/* Title + external link */}
          <Flex align="center" gap={8} className={dim ? " is-dim" : ""} style={{ minWidth: 0 }}>
            <Text
              fw={500}
              title={title}
              className="game-title"
              style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {title}
            </Text>

            {href && (
              <Anchor
                href={href}
                target="_blank"
                rel="noopener"
                aria-label={`Open link for ${title} in a new tab`}
                title={`Open ${title}`}
                onClick={(e) => e.stopPropagation()}
                style={{ marginLeft: "auto", lineHeight: 0 }}
              >
                <IconExternalLink size={16} stroke={2} />
              </Anchor>
            )}
          </Flex>

          {/* Year */}
          <Box className={dim ? " is-dim" : ""} ta="center">
            {year ? <Text>{year}</Text> : ""}
          </Box>

          {/* Source */}
          <Box className={dim ? " is-dim" : ""} ta="center">
            {source &&
              (() => {
                const proto = sourceProtocolLink(source, raw.GameId ? raw.GameId.toString() : "");
                return proto ? (
                  <Badge
                    variant="outline"
                    component="a"
                    href={proto}
                    rel="noopener"
                    title={`Open ${source}${id ? ` — ${title}` : ""}`}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    style={{
                      boxShadow: "0 2px 0 0 rgb(0 0 0 / 30%)",
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    {sourceTrim[source]}
                  </Badge>
                ) : (
                  <Badge variant="outline" size="sm" style={{ boxShadow: "0 2px 0 0 rgb(0 0 0 / 30%)" }}>
                    {sourceTrim[source]}
                  </Badge>
                );
              })()}
          </Box>

          {/* Tags */}
          <Box className={dim ? " is-dim" : ""}>
            <Group gap={6} align="center" wrap="wrap" style={{ maxHeight: "100%" }}>
              {(tags ?? []).map((t) => (
                <Badge key={t} variant="dark" size="sm" style={{ boxShadow: "0 2px 0 0 rgb(0 0 0 / 30%)" }}>
                  {t}
                </Badge>
              ))}
            </Group>
          </Box>
        </Box>

        {/* Collapse (remove the old bg code from inside) */}
        <Collapse in={isOpen} transitionDuration={ANIM.collapseMs}>
          <Paper
            pl="md" pt="md" pr={6} pb={0}
            ml={0} mt={0} mr={48} mb="lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "transparent",
              opacity: bgOn ? 1 : 0,
              transform: bgOn ? "translateY(0)" : "translateY(6px)",
              willChange: "opacity, transform",
              transitionProperty: "opacity, transform",
              transitionDuration: "200ms, 260ms",
              transitionTimingFunction: "ease, ease",
              transitionDelay: bgOn ? `${ANIM.collapseContentDelayMs}ms, ${ANIM.collapseContentDelayMs}ms` : "0ms, 0ms",
            }}
          >
            <Group align="start" gap="md" wrap="nowrap" pb={0}>
              {everOpened && coverUrl ? (
                <Image
                  src={coverUrl}
                  alt={`${title} cover`}
                  w={220}
                  mb="md"
                  radius="md"
                  fit="cover"
                  loading="lazy"
                />
              ) : null}

              <AspectRatio ratio={16 / 9} w="100%">
                <Box />
              </AspectRatio>

              {/* <Box
                role="region"
                aria-label={`${title} description`}
                p="sm"
                pr="lg"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  flex: 1,
                }}
              >
                {everOpened ? (
                  descriptionHtml ? (
                    <div
                      style={{ opacity: 0.9, fontSize: "var(--mantine-font-size-sm)" }}
                      dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                    />
                  ) : (
                    <Text className="is-dim" size="sm">(No description)</Text>
                  )
                ) : null}
              </Box> */}
            </Group>
          </Paper>
        </Collapse>
      </Box>
    </Box>
  );
}