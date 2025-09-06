import React from "react";
import { MantineProvider, ColorSchemeScript, AppShell, Burger, Group, Title, Menu, ActionIcon, Text, NumberFormatter } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { LibraryView } from "./components/library/LibraryView";
import { loadLibrary } from "./lib/data";
import { SyncDialog } from "./components/sync/SyncDialog";

import "@mantine/core/styles.css";
import "./index.scss";

export default function App() {
  const [opened, { toggle }] = useDisclosure(false);
  const [syncOpen, setSyncOpen] = React.useState(false);

  const [state, setState] = React.useState<
    | { ok: true; data: Awaited<ReturnType<typeof loadLibrary>> }
    | { ok: false; error: string }
    | null
  >(null);

  const [counts, setCounts] = React.useState<{ filtered: number; total: number }>({ filtered: 0, total: 0 });

  const reload = React.useCallback(() => {
    loadLibrary()
      .then((data) => setState({ ok: true, data }))
      .catch((e) => setState({ ok: false, error: String(e) }));
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  return (
    <>
      <ColorSchemeScript />
      <MantineProvider
        defaultColorScheme="auto"
        theme={{ primaryColor: "indigo", defaultRadius: "md", fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <AppShell header={{ height: 56 }} padding="md" h="100dvh"
          styles={{ main: { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } }}>
          <AppShell.Header>
            <Group h="100%" px="md" justify="space-between">
              <Group gap="sm">
                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                <Title order={4}>Library</Title>
                
                <Text c="dimmed" size="sm">
                  <NumberFormatter value={counts.filtered} thousandSeparator /> /
                  <NumberFormatter value={counts.total} thousandSeparator />
                </Text>
              </Group>

              <Menu withinPortal position="bottom-end" withArrow>
                <Menu.Target>
                  <ActionIcon variant="subtle" aria-label="Menu">
                    <span style={{ display: "inline-block", width: 18 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor" />
                        <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" />
                        <rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor" />
                      </svg>
                    </span>
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item onClick={() => setSyncOpen(true)}>Sync backup…</Menu.Item>
                  <Menu.Item component="a" href="/data/" target="_blank">Open folder</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </AppShell.Header>

          <AppShell.Main style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            {!state ? (
              <div className="view" style={{ paddingTop: 16 }}>Loading…</div>
            ) : !state.ok ? (
              <div className="view" style={{ paddingTop: 16 }}>Failed to load library: {state.error}</div>
            ) : (
              <LibraryView
                data={state.data}
                onCountsChange={(filtered, total) => setCounts({ filtered, total })}
              />
            )}
          </AppShell.Main>
        </AppShell>

        <SyncDialog opened={syncOpen} onClose={() => setSyncOpen(false)} onSuccess={reload} />
      </MantineProvider>
    </>
  );
}
