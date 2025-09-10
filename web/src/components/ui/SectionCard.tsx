import React from "react";
import { Card, Group, Stack, Text } from "@mantine/core";
export default function SectionCard({
    title, right, children,
}: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
    return (
        <Card>
            <Group justify="space-between" mb="xs">
                <Text fw={600}>{title}</Text>
                {right}
            </Group>
            <Stack gap="sm">{children}</Stack>
        </Card>
    );
}
