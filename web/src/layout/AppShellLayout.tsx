import React from "react";
import { AppShell, Burger, Group, Title, ActionIcon, NavLink, ScrollArea, Text, rem, useMantineColorScheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, useLocation } from "react-router-dom";
import { IconSun, IconMoon, IconHome2, IconBooks, IconCloudUpload, IconSettings } from "../lib/icons";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();
    const location = useLocation();
    const { colorScheme, setColorScheme } = useMantineColorScheme();

    return (
        <AppShell
            header={{ height: 56 }}
            navbar={{ width: 150, breakpoint: "sm", collapsed: { mobile: !opened } }}
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <Title order={3}>Playnite Viewer</Title>
                    </Group>
                    <ActionIcon
                        variant="subtle"
                        aria-label="Toggle color scheme"
                        onClick={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")}
                        size="lg"
                    >
                        {colorScheme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
                    </ActionIcon>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="sm">
                <ScrollArea style={{ height: "calc(100vh - 56px)" }}>
                    <NavLink
                        component={Link}
                        to="/"
                        label="Home"
                        leftSection={<IconHome2 size={18} />}
                        active={location.pathname === "/"}
                    />
                    <NavLink
                        component={Link}
                        to="/library"
                        label="Library"
                        leftSection={<IconBooks size={18} />}
                        active={location.pathname.startsWith("/library")}
                    />
                    <NavLink
                        component={Link}
                        to="/sync"
                        label="Sync"
                        leftSection={<IconCloudUpload size={18} />}
                        active={location.pathname.startsWith("/sync")}
                    />
                    <NavLink
                        component={Link}
                        to="/settings"
                        label="Settings"
                        leftSection={<IconSettings size={18} />}
                        active={location.pathname.startsWith("/settings")}
                    />
                    <Text className="is-dim" size="xs" pl={rem(12)} pt="md">v1.0</Text>
                </ScrollArea>
            </AppShell.Navbar>

            <AppShell.Main>{children}</AppShell.Main>
        </AppShell>
    );
}
