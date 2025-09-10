import { Group, Title, Text } from "@mantine/core";
export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <Group mb="sm" align="baseline">
            <Title order={2}>{title}</Title>
            {subtitle && <Text c="dimmed">{subtitle}</Text>}
        </Group>
    );
}
