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
  const { grid, hasMenu, desktopMode, navbarOpened, toggleNavbar, closeNavbar, setDesktopMode } = useInterLinkedTheme();
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
              mobile: !navbarOpened, // mobile open/close
              desktop: desktopClosed, // desktop closed/not shown
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
      {/* Render navbar only when not hidden and not desktop-closed */}
      {!hideSite && !desktopClosed && (
        <AppShell.Navbar p={0} withBorder={false}>
          <AppNavbar
            mini={desktopMini}
            toggleNavbar={() => {
              // Close overlay only on mobile after clicking an item
              if (!hasMenu) closeNavbar();
            }}
            onIntroDone={flow.gate.onIntroDone}
            gateStyle={flow.gate.gateStyle}
          />
        </AppShell.Navbar>
      )}

      {/* MOBILE burger (your existing behavior) */}
      {!hideSite && flow.gate.showBurger && (
        <Box
          style={{
            position: "absolute",
            top: -5,
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
            hiddenFrom="sm"
            aria-label="Toggle navigation"
            color="var(--interlinked-color-primary)"
          />
        </Box>
      )}

      {/* DESKTOP controls (sm+): closed + mini/normal */}
      {!hideSite && (
        <Box
          visibleFrom="sm"
          style={{
            position: "absolute",
            top: -5,
            left: 10,
            height: grid.rowHeight,
            display: "flex",
            alignItems: "center",
            zIndex: grid.z.top,
          }}
        >
          <Group gap={6}>
            <ActionIcon
              variant="subtle"
              aria-label="Toggle navbar open/closed"
              onClick={() => setDesktopMode((m) => (m === "closed" ? "mini" : "closed"))}
            >
              <IconMenu2 size={18} />
            </ActionIcon>

            <ActionIcon
              variant="subtle"
              aria-label="Toggle navbar mini/normal"
              disabled={desktopClosed}
              onClick={() => setDesktopMode((m) => (m === "normal" ? "mini" : "normal"))}
            >
              {desktopMode === "normal" ? (
                <IconChevronLeft size={18} />
              ) : (
                <IconChevronRight size={18} />
              )}
            </ActionIcon>
          </Group>
        </Box>
      )}

      <AppShell.Main>
        <Box style={flow.gate.gateStyle}>{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
