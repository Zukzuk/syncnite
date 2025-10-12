import React from "react";
import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppHeader } from "../components/ui/AppHeader";
import { AppNavbar } from "../components/ui/AppNavbar";
import { GRID } from "../lib/constants";

export default function AppShellLayout({
  children,
  hideSite = false,
}: {
  children: React.ReactNode;
  hideSite?: boolean;
}) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={hideSite ? undefined : { height: GRID.rowHeight }}
      navbar={
        hideSite
          ? undefined
          : { width: GRID.menuWidth, breakpoint: "sm", collapsed: { mobile: !opened } }
      }
    >
      {!hideSite && (
        <AppShell.Header>
          <AppHeader opened={opened} onToggleNav={toggle} />
        </AppShell.Header>
      )}

      {!hideSite && (
        <AppShell.Navbar p="sm" pr={0} pl={0}>
          <AppNavbar />
        </AppShell.Navbar>
      )}

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
