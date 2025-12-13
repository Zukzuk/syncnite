import React from "react";
import { AppShell, Burger, Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppNavbar } from "./AppNavbar";
import { GRID, Z_INDEX } from "../lib/constants";

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
      header={undefined}
      navbar={
        hideSite
          ? undefined
          : {
            width: GRID.navBarWidth,
            breakpoint: "sm",
            collapsed: { mobile: !opened },
          }
      }
    >
      {!hideSite && (
        <AppShell.Navbar p={0}>
          <AppNavbar />
        </AppShell.Navbar>
      )}

      {/* Floating burger for mobile toggle */}
      {!hideSite && (
        <Box
          // keep it on top of content
          style={{
            position: "relative",
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
