import React from "react";
import { Badge, Group, Text } from "@mantine/core";
import { IconImage } from "./IconImage";
import { effectiveLink } from "../../lib/utils";

export type GameRowProps = {
  id: string;
  hidden: boolean;
  showHidden: boolean;
  installed: boolean;
  iconUrl: string;
  title: string;
  source: string;
  tags: string[];
  year?: number | null;
  url: string | null;
};

export function GameRow(props: GameRowProps) {
  const { id, hidden, showHidden, installed, iconUrl, title, source, tags, year, url } = props;

  const href = url ?? effectiveLink({ url, source, title, tags });
  const dim = hidden && showHidden;

  // Playnite schemes:
  const actionHref = installed
    ? `playnite://play/${encodeURIComponent(id)}`
    : `playnite://InstallGame/${encodeURIComponent(id)}`;

  return (
    <div
      data-row-id={id}
      className={`game-row${dim ? " is-dim" : ""}${installed ? " is-installed" : ""}`}
      style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr 90px 160px auto",
        alignItems: "center",
        gap: 12,
        height: 56,
        padding: "0 12px",
        borderBottom: "1px solid var(--mantine-color-default-border)",
        opacity: dim ? 0.55 : 1,
      }}
    >
      <div style={{ width: 56 }}>
        <div className="icon-wrap" style={{ opacity: dim ? 0.8 : 1, position: "relative", width: 40, height: 40 }}>
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

      <div>
        {href ? (
          <Text component="a" href={href} target="_blank" rel="noopener" fw={500} c={dim ? "dimmed" : undefined}>
            {title}
          </Text>
        ) : (
          <Text fw={500} c={dim ? "dimmed" : undefined}>{title}</Text>
        )}
      </div>

      <div style={{ width: 90 }}>
        <Text c={dim ? "dimmed" : undefined}>{year ?? ""}</Text>
      </div>

      <div style={{ width: 160 }}>
        {source ? <Text c={dim ? "dimmed" : undefined}>{source}</Text> : <Text c="dimmed">—</Text>}
      </div>

      <div>
        <Group gap={6} style={{ opacity: dim ? 0.8 : 1 }}>
          {tags.map((t) => (
            <Badge key={t} variant="light">{t}</Badge>
          ))}
        </Group>
      </div>
    </div>
  );
}
