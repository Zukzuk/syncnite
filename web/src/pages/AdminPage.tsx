import * as React from "react";
import { Stack, Card, Text, Group, Badge, Divider, Code, Alert } from "@mantine/core";
import { useAuth } from "../hooks/useAuth";

export default function AdminPage() {
    const { state } = useAuth({ pollMs: 0 });

    return (
        <Stack p="md" gap="lg">
            <Text fz={24} fw={700}>Admin Account</Text>

            <Card withBorder>
                <Text fw={600} mb="xs">Admin</Text>
                <Group>
                    <Badge color="green" variant="filled">active</Badge>
                    <Text size="md">Signed in as&nbsp;<Code>{state.email}</Code></Text>
                </Group>
                <Divider my="sm" />
                <Text size="sm" className="is-dim">
                    Currently maximum of 1 admin per server
                </Text>
            </Card>
        </Stack>
    );
}
