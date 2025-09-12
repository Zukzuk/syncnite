import { Badge, Group, Text } from "@mantine/core";
import { IconImage } from "./IconImage";
import { effectiveLink } from "../../lib/utils";
import { GameRowProps } from "../../lib/types";

export function GameRow(props: GameRowProps) {
  const { id, hidden, showHidden, installed, iconUrl, title, source, tags, year, url } = props;
  const href = url ?? effectiveLink({ url, source, title, tags });
  const dim = hidden && showHidden;
  const actionHref = `playnite://playnite/start/${encodeURIComponent(id)}`;

  return (
    <div
      data-row-id={id}
      className={`game-row${dim ? " is-dim" : ""}${installed ? " is-installed" : ""}`}
      style={{
        display: "grid",
        gridTemplateColumns: "56px minmax(0, 40%) 60px 80px minmax(200px, 1fr)",
        minWidth: "calc(56px + 40% + 60px + 80px + 200px + 24px)",
        alignItems: "center",
        gap: 12,
        height: 56,
        padding: "0 12px",
        borderBottom: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <div style={{ width: 56 }} className={dim ? " is-dim" : ""}>
        <div
          className="icon-wrap game-row"
          style={{
            position: "relative",
            width: 40,
            height: 40
          }}
        >
          <IconImage src={iconUrl} />
          {!dim && (
            <a
              className="play-overlay"
              href={actionHref}
              aria-label={installed ? `Play ${title}` : `Install ${title}`}
              title={installed ? "Play" : "Install"}
            >
              {installed ? (
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 20h14v-2H5v2zm7-18L5.33 9h4.67v6h4V9h4.67L12 2z" fill="currentColor" />
                </svg>
              )}
            </a>
          )}
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
          >
            {title}
          </Text>
        ) : (
          <Text fw={500}>
            {title}
          </Text>
        )}
      </div>

      <div className={dim ? " is-dim" : ""}>
        {year ? (
          <Text>{year}</Text>
        ) : (
          <Text>—</Text>
        )}
      </div>

      <div className={dim ? " is-dim" : ""}>
        {source ? (
          <Text>{source}</Text>
        ) : (
          <Text className="is-dim">—</Text>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Group
          gap={6}
          wrap="wrap"
          style={{ maxHeight: "100%" }}
        >
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
