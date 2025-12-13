import * as React from "react";
import { Stack, Card, Text, Group, Badge, Divider, Code, Container } from "@mantine/core";
import { useAuth } from "../../hooks/useAuth";
import { GRID } from "../../lib/constants";
import { TextDataRow } from "../../components/TextDataRow";

export default function AdminPage(): JSX.Element {
    const { state } = useAuth({ pollMs: 0 });

    return (
        <Container size="sm" py="lg">
            <Stack gap="lg">
                <Text fz={28} fw={700}>
                    Admin Account
                </Text>
                <Text size="sm" c="dimmed">
                    Manage your InterLinked admin account.
                </Text>

                <Card withBorder>
                    <Text fw={600} mb="xs">Admin</Text>
                    <Group>
                        <Badge
                            color="var(--interlinked-color-success)"
                            variant="filled"
                            size="sm"
                            style={{ position: "absolute", top: GRID.gap, right: GRID.gap }}
                        >
                            active
                        </Badge>
                        <TextDataRow label="Signed in as" value={state.email ?? "(unknown)"} />
                    </Group>

                    <Divider my="sm" />

                    <Text size="sm" c="dimmed">
                        Currently maximum of 1 admin per server
                    </Text>
                </Card>
            </Stack>
        </Container>
    );
}
