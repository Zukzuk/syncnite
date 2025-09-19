import { Badge, Group, Text } from "@mantine/core";
import { IconImage } from "./IconImage";
import { GRID } from "../../lib/constants";
import { PlayActionOverlay } from "../ui/PlayActionOverlay";
import { effectiveLink } from "../../lib/utils";
import { GameRowProps } from "../../lib/types";

export function GameRow(props: GameRowProps) {
  const { id, hidden, showHidden, installed, iconUrl, title, source, tags, year, url } = props;
  const href = url ?? effectiveLink({ url, source, title, tags });
  const dim = hidden;
  const actionHref = `playnite://playnite/start/${encodeURIComponent(id)}`;

  return (
    <div
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
      <div style={{ width: 56 }} className={dim ? " is-dim" : ""}>
        <div className="icon-wrap" style={{ position: "relative", width: 40, height: 40 }}>
          <PlayActionOverlay installed={installed} href={actionHref} title={title}>
            <div className="icon-base">
              <IconImage src={iconUrl} />
            </div>
          </PlayActionOverlay>
        </div>
      </div>

      <div className={dim ? " is-dim" : ""}>
        {href ? (
          <Text
            component="a"
            href={href}
            target="_blank"
            rel="noopener"
            fw={500}
            className="game-title"
            style={{ textDecoration: "underline" }}
            title={title}
          >
            {title}
          </Text>
        ) : (
          <Text fw={500} title={title}>{title}</Text>
        )}
      </div>

      <div className={dim ? " is-dim" : ""}>
        {year ? <Text>{year}</Text> : <Text>—</Text>}
      </div>

      <div className={dim ? " is-dim" : ""}>
        <Text>{source}</Text>
      </div>

      <div className={dim ? " is-dim" : ""}>
        <Group gap={6} align="center" wrap="wrap" style={{ maxHeight: "100%" }}>
          {(tags ?? []).map((t) => (
            <Badge key={t} variant="dark" size="sm" style={{ boxShadow: "0 2px 0 0 rgb(0 0 0 / 30%)" }}>
              {t}
            </Badge>
          ))}
        </Group>
      </div>
    </div>
  );
}
