import React from "react";
import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppHeader } from "../components/ui/AppHeader";
import { AppNavbar } from "../components/ui/AppNavbar";
import { GRID } from "../lib/constants";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();

    return (
        <AppShell
            header={{ height: GRID.rowHeight }}
            navbar={{ width: 160, breakpoint: "sm", collapsed: { mobile: !opened } }}
        >
            <AppShell.Header>
                <AppHeader opened={opened} onToggleNav={toggle} />
            </AppShell.Header>

            <AppShell.Navbar p="sm" pr={0} pl={0}>
                <AppNavbar />
            </AppShell.Navbar>

            <AppShell.Main>{children}</AppShell.Main>
        </AppShell>
    );
}
