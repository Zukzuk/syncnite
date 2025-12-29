import { Stack, Text, Card, Group, ThemeIcon, Badge, Divider, Tooltip } from "@mantine/core";
import { IconClock, IconDownload } from "@tabler/icons-react";
import { InterLinkedGrid } from "../../types/interlinked";
import { useAuth } from "../../hooks/useAuth";
import { useExtensionStatus } from "../../hooks/useExtensionStatus";
import { API_ENDPOINTS, INTERVAL_MS, WEB_APP_VERSION } from "../../constants";
import { CustomIconSVG } from "../../components/CustomIcon";
import { TextDataRow } from "../../components/TextDataRow";
import { IconButton } from "../../components/IconButton";

type Props = {
    grid: InterLinkedGrid;
};

export default function PlayniteCard({ grid }: Props): JSX.Element {
    const { state } = useAuth({ pollMs: 0 });
    const isAdmin = state.role === "admin";

    const { connected, lastPingAt, loading, versionMismatch, extVersion } = useExtensionStatus({ pollMs: INTERVAL_MS });

    return (
        < Card withBorder shadow="sm" radius="md" >
            <Group justify="space-between" align="flex-start" mb="sm">

                <Group gap={grid.gap * 2}>
                    <ThemeIcon radius="xl" variant="light">
                        <CustomIconSVG type="playnite" />
                    </ThemeIcon>

                    <Stack gap={0}>
                        <Text fw={600}>Playnite connection</Text>
                        <Text size="xs" c="dimmed">
                            Download and install the Playnite extension to sync your game library with InterLinked.
                        </Text>
                    </Stack>
                </Group>

                {/* Admin-only status badge, same semantics as navbar */}
                {isAdmin && !loading && (
                    <Tooltip
                        withArrow
                        style={{ fontSize: 10 }}
                        label={
                            !connected
                                ? "No recent ping from admin extension"
                                : versionMismatch
                                    ? `Version mismatch: server ${WEB_APP_VERSION ?? "?"}, extension ${extVersion ?? "?"}`
                                    : lastPingAt
                                        ? `Admin extension last ping: ${new Date(lastPingAt).toLocaleTimeString()}`
                                        : "Admin extension is currently pinging the API"
                        }
                    >
                        <Badge
                            color={
                                !connected
                                    ? "var(--interlinked-color-error)"
                                    : versionMismatch
                                        ? "var(--interlinked-color-warning)"
                                        : "var(--interlinked-color-success)"
                            }
                            variant="filled"
                            size="sm"
                            style={{ position: "absolute", top: grid.gap, right: grid.gap }}
                        >
                            {!connected 
                                ? "unlinked"
                                : versionMismatch 
                                    ? "version mismatch" 
                                    : "linked"}
                        </Badge>
                    </Tooltip>
                )}
            </Group>

            <Divider my="sm" />

            <Stack gap="sm">
                <Stack gap={4}>
                    <TextDataRow label="Server version" value={`${WEB_APP_VERSION}`} />

                    {isAdmin && (
                        <>
                            <TextDataRow
                                label="Extension version"
                                value={extVersion ? `v${extVersion}` : "(unknown)"}
                            />
                            <TextDataRow
                                icon={<IconClock size={14} />}
                                label="Last ping"
                                value={lastPingAt ? new Date(lastPingAt).toLocaleString() : "(unknown)"}
                                size="xs"
                            />
                        </>
                    )}
                </Stack>

                <Group mt="xs" gap="sm">
                    <IconButton 
                        type="link"
                        href={API_ENDPOINTS.EXTENSION_DOWNLOAD}
                        icon={<IconDownload color="var(--interlinked-color-secondary)" size={14} />}
                        text="Download extension"
                        label={`Download SyncniteBridge ${WEB_APP_VERSION} (.pext)`}
                    />
                </Group>
            </Stack>
        </Card >
    );
}