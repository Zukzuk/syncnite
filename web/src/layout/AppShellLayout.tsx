import React from "react";
import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppHeader } from "../components/ui/AppHeader";
import { AppNavbar } from "../components/ui/AppNavbar";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();

    return (
        <AppShell
            header={{ height: 56 }}
            navbar={{ width: 150, breakpoint: "sm", collapsed: { mobile: !opened } }}
        >
            <AppShell.Header>
                <AppHeader opened={opened} onToggleNav={toggle} />
            </AppShell.Header>

            <AppShell.Navbar p="sm">
                <AppNavbar />
            </AppShell.Navbar>

            <AppShell.Main>{children}</AppShell.Main>
        </AppShell>
    );
}
