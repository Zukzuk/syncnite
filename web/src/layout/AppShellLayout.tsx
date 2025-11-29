import React from "react";
import { AppShell, Burger, Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppNavbar } from "./AppNavbar";
import { GRID, Z_INDEX } from "../lib/constants";

const WEB_APP_VERSION = `v${window.__APP_VERSION__}`;

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
      // no header anymore
      header={undefined}
      navbar={
        hideSite
          ? undefined
          : {
            width: GRID.menuWidth,
            breakpoint: "sm",
            collapsed: { mobile: !opened },
          }
      }
    >
      {!hideSite && (
        <AppShell.Navbar p="sm" pr={0} pl={0}>
          <AppNavbar appVersion={WEB_APP_VERSION} />
        </AppShell.Navbar>
      )}

      {/* Floating burger for mobile toggle */}
      {!hideSite && (
        <Box
          // keep it on top of content
          style={{
            position: "fixed",
            top: 10,
            left: 10,
            zIndex: Z_INDEX.top,
          }}
        >
          <Burger
            opened={opened}
            onClick={toggle}
            size="sm"
            hiddenFrom="sm"
            aria-label="Toggle navigation"
          />
        </Box>
      )}

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
