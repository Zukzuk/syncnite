import { useEffect, useState } from "react";
import { Stack, Text, Card, Group, ThemeIcon, Badge, Divider } from "@mantine/core";
import { IconUser, IconUserHexagon } from "@tabler/icons-react";
import { useAuth } from "../../hooks/useAuth";
import { useInterLinkedTheme } from "../../hooks/useInterLinkedTheme";
import { fetchUsers } from "../../services/AccountService";
import { TextDataRow } from "../../components/TextDataRow";

export default function AccountCard(): JSX.Element {
    const { state } = useAuth({ pollMs: 0 });
    const isAdmin = state.role === "admin";

    const { grid } = useInterLinkedTheme();

    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadUsers() {
            if (!isAdmin) return; // don't even try as non-admin

            setLoadingUsers(true);
            setUsersError(null);
            try {
                const u = await fetchUsers();
                if (!cancelled) setUsers(u);
            } catch (e: any) {
                if (!cancelled) setUsersError(String(e?.message ?? e));
            } finally {
                if (!cancelled) setLoadingUsers(false);
            }
        }

        void loadUsers();
        return () => {
            cancelled = true;
        };
    }, [isAdmin]);


    return (
        <Card withBorder shadow="sm" radius="md">
            <Group justify="space-between" align="flex-start" mb="sm">

                <Group gap={grid.gap * 2}>
                    <ThemeIcon radius="xl" variant="light">
                        {isAdmin ? <IconUserHexagon size={18} /> : <IconUser size={18} />}
                    </ThemeIcon>

                    <Stack gap={0}>
                        <Text fw={600}>Account</Text>
                        <Text size="xs" c="dimmed">
                            Basic information about your InterLinked login.
                        </Text>
                    </Stack>
                </Group>

                <Badge
                    color={isAdmin ? "var(--interlinked-color-success)" : "var(--interlinked-color-error)"}
                    variant="filled"
                    size="sm"
                    style={{ position: "absolute", top: grid.gap, right: grid.gap }}
                >
                    {isAdmin ? "Admin" : "User"}
                </Badge>
            </Group>

            <Divider my="sm" />

            <Stack gap={4}>
                <TextDataRow label="Name" value={state.email ?? "(unknown)"} />

                {isAdmin && (
                    <>
                        <TextDataRow
                            label="Registered users"
                            value={
                                loadingUsers ? "Loading…" : usersError ? `Failed: ${usersError}` : String(users.length)
                            }
                        />

                        {!loadingUsers &&
                            !usersError &&
                            users
                                .slice()
                                .sort((a, b) => String(a.email ?? "").localeCompare(String(b.email ?? "")))
                                .map((u) => (
                                    <TextDataRow
                                        key={u.email ?? JSON.stringify(u)}
                                        icon={<IconUser size={14} />}
                                        label={u.email ?? "(unknown email)"}
                                        value={u.role ?? "user"}
                                        size="xs"
                                    />
                                ))}
                    </>
                )}
            </Stack>
        </Card>
    );
}