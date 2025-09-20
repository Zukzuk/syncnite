import { Badge, Box, Group, Text } from "@mantine/core";
import { IconImage } from "../ui/IconImage";
import { GRID, playniteAction, sourceProtocolLink, sourceTrim } from "../../lib/constants";
import { PlayActionOverlay } from "../ui/PlayActionOverlay";
import { effectiveLink } from "../../lib/utils";
import { Row } from "../../lib/types";
import { IconExternalLink } from "../../lib/icons";

import "./GameRow.scss";

export function GameRow(props: Row) {
  const { id, hidden, installed, iconUrl, title, source, tags, year, url } = props;
  const href = url ?? effectiveLink({ url, source, title, tags });
  const dim = hidden;

  return (
    <Box
      data-row-id={id}
      className={`game-row${dim ? " is-dim" : ""}${installed ? " is-installed" : ""}`}
      style={{
        display: "grid",
        gridTemplateColumns: GRID.cols,
        minWidth: GRID.minWidth,
        alignItems: "center",
        gap: 12,
        height: GRID.rowHeight,
        padding: "0 12px",
        borderBottom: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Box style={{ width: 56 }} className={dim ? " is-dim" : ""}>
        
        <Box className="icon-wrap" style={{ position: "relative", width: 40, height: 40 }}>
          <PlayActionOverlay installed={installed} href={playniteAction(id)} title={title}>
            <Box className="icon-base">
              <IconImage src={iconUrl} />
            </Box>
          </PlayActionOverlay>
        </Box>
      </Box>

      <Box
        className={dim ? " is-dim" : ""}
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        <Text
          fw={500}
          title={title}
          className="game-title"
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {title}
        </Text>

        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener"
            aria-label={`Open link for ${title} in a new tab`}
            title={`Open ${title}`}
            style={{ marginLeft: "auto", display: "inline-flex", lineHeight: 0 }}
          >
            <IconExternalLink size={16} stroke={2} />
          </a>
        )}
      </Box>

      <Box className={dim ? " is-dim" : ""} style={{ textAlign: "center" }}>
        {year ?
          <Text>{year}</Text>
          :
          ""
        }
      </Box>

      <Box className={dim ? " is-dim" : ""} style={{ textAlign: "center" }}>
        {source && (
          (() => {
            const proto = sourceProtocolLink(source, id || "");
            return proto ? (
              <Badge
                variant="outline"
                component="a"
                href={proto}
                rel="noopener"
                title={`Open ${source}${id ? ` — ${title}` : ""}`}
                style={{ boxShadow: "0 2px 0 0 rgb(0 0 0 / 30%)", textDecoration: "none", cursor: "pointer" }}
              >
                {sourceTrim[source]}
              </Badge>
            ) : (
              <Badge variant="outline" size="sm" style={{ boxShadow: "0 2px 0 0 rgb(0 0 0 / 30%)" }}>
                {sourceTrim[source]}
              </Badge>
            );
          })()
        )}
      </Box>

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
  );
}
