import { ReactNode } from "react";
import { AppShell, Burger, Box, ActionIcon, Group } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconMenu2 } from "@tabler/icons-react";
import { AppNavbar } from "./AppNavbar";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";
import { useIntroFlow } from "../hooks/useIntroFlow";

type Props = {
  children: ReactNode;
  hideSite?: boolean;
}

export default function AppShellLayout({ children, hideSite = false }: Props) {
  const { grid, hasMenu, desktopMode, navbarOpened, isDark, toggleNavbar, closeNavbar, setDesktopMode } = useInterLinkedTheme();
  const desktopClosed = desktopMode === "closed";
  const desktopMini = desktopMode === "mini";

  // Intro flow for the navbar burger
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
            // base is ignored in mobile-open state (overlay becomes 100% width by design)
            // sm+ is where we do mini/normal widths
            width: {
              base: grid.navBarWidth,
              sm: desktopMini ? grid.navBarMiniWidth : grid.navBarWidth,
            },
            breakpoint: "sm",
            collapsed: {
              mobile: !navbarOpened,
              desktop: desktopClosed,
            },
          }
      }
      styles={{
        navbar: {
          overflow: "hidden",
          transition: "width 200ms ease",
        },
      }}
    >

      {/* DESKTOP navbar (sm+): mini/normal */}
      {!hideSite && !desktopClosed && (
        <AppShell.Navbar p={0} withBorder={false}>
          <AppNavbar
            desktopMini={desktopMini}
            toggleNavbar={() => {
              // Close overlay only on mobile after clicking an item
              if (!hasMenu) closeNavbar();
            }}
            onIntroDone={flow.gate.onIntroDone}
            gateStyle={flow.gate.gateStyle}
            hasMenu={hasMenu}
            isDark={isDark}
            grid={grid}
          />
        </AppShell.Navbar>
      )}

      {/* MOBILE burger (your existing behavior) */}
      {!hasMenu && (
        <Box
          style={{
            position: "absolute",
            top: -grid.gap,
            left: 10,
            height: grid.rowHeight,
            display: "flex",
            alignItems: "center",
            zIndex: grid.z.top,
          }}
        >
          <Burger
            opened={navbarOpened}
            onClick={toggleNavbar}
            size="sm"
            lineSize={2}
            aria-label="Toggle navigation"
            color="var(--interlinked-color-primary)"
          />
        </Box>
      )}

      {/* DESKTOP controls (sm+): closed + mini/normal */}
      {!hideSite && hasMenu && (
        <Box
          style={{
            position: "absolute",
            top: -12,
            left: 10,
            height: grid.rowHeight,
            display: "flex",
            alignItems: "center",
            zIndex: grid.z.top,
          }}
        >
          <ActionIcon
            variant="transparent"
            aria-label="Toggle navbar mini/normal"
            onClick={() => setDesktopMode((m) => (m === "normal" ? "mini" : "normal"))}
          >
            {desktopMode === "normal" ? (
              <IconChevronLeft size={24} stroke={2} />
            ) : (
              <IconChevronRight size={24} stroke={2} />
            )}
          </ActionIcon>
        </Box>
      )}

      <AppShell.Main>
        <Box style={flow.gate.gateStyle}>{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
