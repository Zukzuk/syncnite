import React from "react";
import { Card, Group, Stack, Text } from "@mantine/core";

type Props = { 
    title: string; 
    right?: React.ReactNode; 
    children: React.ReactNode 
}

export function SectionCard({
    title, right, children,
}: Props) {
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
