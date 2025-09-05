import React from "react";
import { Badge, Group, Table, Text } from "@mantine/core";
import { IconImage } from "./IconImage";
import { effectiveLink } from "../../lib/utils";

export function GameRow(props: {
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
}) {
  const { id, hidden, showHidden, installed, iconUrl, title, source, tags, year, url } = props;

  const href = url ?? effectiveLink({ url, source, title, tags });
  const dim = hidden && showHidden;

  // Playnite schemes:
  const actionHref = installed
    ? `playnite://play/${encodeURIComponent(id)}`
    : `playnite://InstallGame/${encodeURIComponent(id)}`;

  return (
    <Table.Tr
      key={id}
      className={`game-row${dim ? " is-dim" : ""}${installed ? " is-installed" : ""}`}
      style={{ height: 56, opacity: dim ? 0.55 : 1 }}
    >
      <Table.Td w={56}>
        <div className="icon-wrap" style={{ opacity: dim ? 0.8 : 1 }}>
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
      </Table.Td>

      <Table.Td>
        {href ? (
          <Text component="a" href={href} target="_blank" rel="noopener" fw={500} c={dim ? "dimmed" : undefined}>
            {title}
          </Text>
        ) : (
          <Text fw={500} c={dim ? "dimmed" : undefined}>{title}</Text>
        )}
      </Table.Td>

      <Table.Td w={90}><Text c={dim ? "dimmed" : undefined}>{year ?? ""}</Text></Table.Td>
      <Table.Td>{source ? <Text c={dim ? "dimmed" : undefined}>{source}</Text> : <Text c="dimmed">—</Text>}</Table.Td>

      <Table.Td>
        <Group gap={6} style={{ opacity: dim ? 0.8 : 1 }}>
          {tags.map((t) => (<Badge key={t} variant="light">{t}</Badge>))}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
