import React from "react";
import { AppShell, Burger, Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppNavbar } from "./AppNavbar";
import { GRID, Z_INDEX } from "../lib/constants";
import { getTheme } from "../theme";
import { useIntroFlow } from "../hooks/useIntroFlow";

export default function AppShellLayout({
  children,
  hideSite = false,
}: {
  children: React.ReactNode;
  hideSite?: boolean;
}) {
  const { breakpoint } = getTheme();
  const [opened, { toggle: toggleNavbar }] = useDisclosure();

  const flow = useIntroFlow({
    gateEnabled: !hideSite,
    gateStartsHidden: true,
  });

  return (
    <AppShell
      header={undefined}
      navbar={
        hideSite
          ? undefined
          : {
            width: GRID.navBarWidth,
            breakpoint,
            collapsed: { mobile: !opened },
          }
      }
    >
      {!hideSite && (
        <AppShell.Navbar p={0} withBorder={false}>
          <AppNavbar
            toggleNavbar={toggleNavbar}
            onIntroDone={flow.gate.onIntroDone}
            gateStyle={flow.gate.gateStyle}
          />
        </AppShell.Navbar>
      )}

      {!hideSite && flow.gate.showBurger && (
        <Box
          style={{
            position: "absolute",
            top: -5,
            left: 10,
            height: GRID.rowHeight,
            display: "flex",
            alignItems: "center",
            zIndex: Z_INDEX.top,
          }}
        >
          <Burger
            opened={opened}
            onClick={toggleNavbar}
            size="sm"
            hiddenFrom={breakpoint}
            aria-label="Toggle navigation"
            color="var(--interlinked-color-primary)"
          />
        </Box>
      )}

      <AppShell.Main>
        <Box style={flow.gate.gateStyle}>{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
