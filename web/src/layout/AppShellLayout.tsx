import React from "react";
import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppHeader } from "../components/ui/AppHeader";
import { AppNavbar } from "../components/ui/AppNavbar";
import { GRID } from "../lib/constants";

export default function AppShellLayout({
  children,
  hideChrome = false,
}: {
  children: React.ReactNode;
  hideChrome?: boolean;
}) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={hideChrome ? undefined : { height: GRID.rowHeight }}
      navbar={
        hideChrome
          ? undefined
          : { width: GRID.menuWidth, breakpoint: "sm", collapsed: { mobile: !opened } }
      }
    >
      {!hideChrome && (
        <AppShell.Header>
          <AppHeader opened={opened} onToggleNav={toggle} />
        </AppShell.Header>
      )}

      {!hideChrome && (
        <AppShell.Navbar p="sm" pr={0} pl={0}>
          <AppNavbar />
        </AppShell.Navbar>
      )}

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
