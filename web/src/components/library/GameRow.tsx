import React from "react";
import {
  Badge,
  Box,
  Group,
  Text,
  Collapse,
  Image,
  Paper,
  ActionIcon,
  Anchor,
  Flex,
  useMantineTheme,
} from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { IconImage } from "../ui/IconImage";
import { PlayActionOverlay } from "../ui/PlayActionOverlay";
import { GRID, sourceTrim, BASE } from "../../lib/constants";
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
  const mrPx =
    typeof theme.spacing.md === "number"
      ? theme.spacing.md * 2
      : `calc(${theme.spacing.md} * 2)`;

  // Cover + description from raw
  const coverRel = (raw as any)?.CoverImage ?? (raw as any)?.BackgroundImage ?? null;
  const coverUrl = buildAssetUrl(coverRel);
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
      }}
      onClick={onToggle}
    >
      {/* Header row (fixed height for column alignment) */}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: GRID.cols,
          alignItems: "center",
          gap: 12,
          height: GRID.rowHeight,
        }}
      >
        {/* First column: chevron + icon */}
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

      {/* Collapse content — cover fixed; only description scrolls; cap height 500 */}
      <Collapse in={isOpen} transitionDuration={140}>
        <Paper
          p="md"
          pr={6}
          pb={0}
          m="md"
          mr={52}
          onClick={(e) => e.stopPropagation()}
        >
          <Group align="start" gap="md" wrap="nowrap" pb={0}>
            {/* Cover image (fixed) */}
            {everOpened && coverUrl ? (
              <Image
                src={coverUrl}
                alt={`${title} cover`}
                w={220}
                pb="sm"
                radius="sm"
                fit="cover"
                loading="lazy"
              />
            ) : null}

            {/* Scrollable description only */}
            <Box
              role="region"
              aria-label={`${title} description`}
              pr="lg"
              pb="sm"
              style={{
                maxHeight: 500,
                overflowY: "auto",
                scrollbarGutter: "stable right-edge",
                flex: 1,
              }}
            >
              {everOpened ? (
                descriptionHtml ? (
                  <div
                    style={{ opacity: 0.9 }}
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
                ) : (
                  <Text className="is-dim" size="sm">
                    (No description)
                  </Text>
                )
              ) : null}
            </Box>
          </Group>
        </Paper>
      </Collapse>
    </Box>
  );
}
