import React from "react";
import { Badge, Group, Table, Text } from "@mantine/core";
import { IconImage } from "./IconImage";
import { effectiveLink } from "../../lib/utils";

export function GameRow(props: {
  id: string;
  hidden: boolean;
  showHidden: boolean;
  iconUrl: string;
  title: string;
  source: string;
  tags: string[];
  year?: number | null;
  url: string | null; // pre-resolved (but effectiveLink will still fallback)
}) {
  const { id, hidden, showHidden, iconUrl, title, source, tags, year, url } = props;
  const href = url ?? effectiveLink({ url, source, title, tags });
  const dim = hidden && showHidden;

  return (
    <Table.Tr key={id} style={{ height: 56, opacity: dim ? 0.55 : 1 }}>
      <Table.Td w={56}>
        <div style={{ opacity: dim ? 0.8 : 1 }}>
          <IconImage src={iconUrl} />
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
      <Table.Td w={90}>
        <Text c={dim ? "dimmed" : undefined}>{year ?? ""}</Text>
      </Table.Td>
      <Table.Td>{source ? <Text c={dim ? "dimmed" : undefined}>{source}</Text> : <Text c="dimmed">—</Text>}</Table.Td>
      <Table.Td>
        <Group gap={6} style={{ opacity: dim ? 0.8 : 1 }}>
          {tags.map((t) => (
            <Badge key={t} variant="light">{t}</Badge>
          ))}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
