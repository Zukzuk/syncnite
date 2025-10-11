import * as React from "react";
import { Stack, Card, Text, Group, Badge, Divider, Code, Alert } from "@mantine/core";
import { fetchAdminStatus } from "../lib/api";
import { useAuth } from "../components/hooks/useAuth";

export default function AdminPage() {
    const { state } = useAuth();
    const [admin, setAdmin] = React.useState<string | null>(null);

    React.useEffect(() => {
        (async () => {
            const s = await fetchAdminStatus();
            setAdmin(s.admin);
        })();
    }, []);

    return (
        <Stack p="md" gap="lg">
            <Text fz={24} fw={700}>Admin Account</Text>

            <Card withBorder>
                <Text fw={600} mb="xs">Admin</Text>
                <Group>
                    <Badge color="green" variant="filled">active</Badge>
                    <Text>Signed in as&nbsp;<Code>{state.email}</Code></Text>
                </Group>
                <Divider my="sm" />
                <Text size="sm" className="is-dim">
                    Current admin (per server): <Code>{admin ?? "(loading…)"}</Code>
                </Text>
            </Card>

            <Card withBorder>
                <Text fw={600} mb="xs">Users</Text>
                <Alert color="gray">
                    This deployment runs in <b>single-admin mode</b>. The API exposes only admin endpoints — no user store yet.
                    When you add multi-user to the API, query and display users here.
                </Alert>
            </Card>
        </Stack>
    );
}
