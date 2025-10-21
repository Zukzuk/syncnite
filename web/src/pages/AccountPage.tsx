import * as React from "react";
import { Stack, Card, Text, Code, Badge } from "@mantine/core";
import { useAuth } from "../hooks/useAuth";
import { fetchAdminStatus } from "../lib/api";

export default function AccountPage() {
    const { state } = useAuth({ pollMs: 0 });
    const [adminEmail, setAdminEmail] = React.useState<string | null>(null);

    React.useEffect(() => {
        (async () => {
            const s = await fetchAdminStatus();
            setAdminEmail(s.admin);
        })();
    }, []);

    const isAdmin = state.email && adminEmail && state.email.toLowerCase() === adminEmail.toLowerCase();

    return (
        <Stack p="md" gap="lg">
            <Text fz={24} fw={700}>My Account</Text>
            <Card withBorder>
                <Text>Email: <Code>{state.email ?? "(unknown)"}</Code></Text>
                <Text mt="xs">Role: {isAdmin ? <Badge color="green">admin</Badge> : <Badge>user</Badge>}</Text>
            </Card>
        </Stack>
    );
}
