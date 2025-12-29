import { ReactNode } from "react";
import { AppShell, Burger, Box } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { AppNavbar } from "./AppNavbar";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";
import { useIntroFlow } from "../hooks/useIntroFlow";
import { DesktopMode } from "../types/app";

type Props = {
  children: ReactNode;
  hideSite?: boolean;
}

export default function AppShellLayout({ children, hideSite = false }: Props) {
  const { grid, hasNavbar, desktopMode, navbarOpened, isDark, toggleNavbar, closeNavbar, setDesktopMode } = useInterLinkedTheme();
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
              if (!hasNavbar) closeNavbar();
            }}
            onIntroDone={flow.gate.onIntroDone}
            gateStyle={flow.gate.gateStyle}
            hasNavbar={hasNavbar}
            isDark={isDark}
            grid={grid}
          />
        </AppShell.Navbar>
      )}

      {/* MOBILE burger (your existing behavior) */}
      {!hasNavbar && (
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

      {/* DESKTOP controls (sm+): full-height right-edge column */}
      {!hideSite && hasNavbar && !desktopClosed && (
        <Box
          visibleFrom="sm"
          role="button"
          aria-label="Toggle navbar mini/normal"
          onClick={() => setDesktopMode((m: DesktopMode) => (m === "normal" ? "mini" : "normal"))}
          style={{
            position: "fixed",
            left: desktopMini
              ? grid.navBarMiniWidth - grid.gap
              : grid.navBarWidth - grid.gap,
            top: 0,
            height: "100dvh",
            width: grid.gap * 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            userSelect: "none",
            zIndex: grid.z.top,
            ...flow.gate.gateStyle,
          }}
        >
          {desktopMode === "normal" ? (
            <IconChevronLeft
              size={18}
              stroke={2}
              color="var(--interlinked-color-suppressed)"
            />
          ) : (
            <IconChevronRight
              size={18}
              stroke={2}
              color="var(--interlinked-color-suppressed)"
            />
          )}
        </Box>
      )}

      <AppShell.Main>
        <Box style={flow.gate.gateStyle}>{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
