import React from "react";
import { MantineProvider, ColorSchemeScript, AppShell, Burger, Group, Title, Menu, ActionIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { LibraryView } from "./components/library/LibraryView";
import { loadLibrary } from "./lib/data";
import { SyncDialog } from "./components/sync/SyncDialog";
import "@mantine/core/styles.css";
import "./index.css";

export default function App() {
    const [opened, { toggle }] = useDisclosure(false); // if you add a sidebar later
    const [syncOpen, setSyncOpen] = React.useState(false);

    const [state, setState] = React.useState<
        { ok: true; data: Awaited<ReturnType<typeof loadLibrary>> } |
        { ok: false; error: string } | null
    >(null);

    React.useEffect(() => {
        loadLibrary()
            .then(data => setState({ ok: true, data }))
            .catch(e => setState({ ok: false, error: String(e) }));
    }, []);

    const reload = React.useCallback(() => {
        loadLibrary()
            .then(data => setState({ ok: true, data }))
            .catch(e => setState({ ok: false, error: String(e) }));
    }, []);

    React.useEffect(() => { reload(); }, [reload]);

    return (
        <>
            <ColorSchemeScript />
            <MantineProvider defaultColorScheme="auto" theme={{ primaryColor: "indigo", defaultRadius: "md", fontFamily: "Inter, system-ui, sans-serif" }}>
                <AppShell
                    header={{ height: 56 }}
                    padding="md"
                    h="100dvh"
                    styles={{
                        main: {
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            minHeight: 0,
                        },
                    }}
                >
                    <AppShell.Header>
                        <Group h="100%" px="md" justify="space-between">
                            <Group>
                                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                                <Title order={4}>Library</Title>
                            </Group>
                            <Menu withinPortal position="bottom-end" withArrow>
                                <Menu.Target>
                                    <ActionIcon variant="subtle" aria-label="Menu">
                                        {/* simple hamburger glyph */}
                                        <span style={{ display: "inline-block", width: 18 }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor" />
                                                <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" />
                                                <rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor" />
                                            </svg>
                                        </span>
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Label>Actions</Menu.Label>
                                    <Menu.Item onClick={() => setSyncOpen(true)}>Sync backup…</Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Item component="a" href="/data/" target="_blank">Open /data</Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>
                    </AppShell.Header>

                    <AppShell.Main
                        style={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            minHeight: 0,
                        }}
                    >
                        {!state ? (
                            <div className="view" style={{ padding: 16 }}>Loading…</div>
                        ) : !state.ok ? (
                            <div className="view" style={{ padding: 16 }}>Failed to load library: {state.error}</div>
                        ) : (
                            <LibraryView data={state.data} />
                        )}
                    </AppShell.Main>
                </AppShell>

                <SyncDialog opened={syncOpen} onClose={() => setSyncOpen(false)} onSuccess={reload} />
            </MantineProvider>
        </>
    );
}
