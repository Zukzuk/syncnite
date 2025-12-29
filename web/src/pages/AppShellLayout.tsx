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
};

export default function AppShellLayout({ children, hideSite = false }: Props) {
  const {
    grid,
    hasNavbar,
    desktopMode,
    navbarOpened,
    isDark,
    toggleNavbar,
    closeNavbar,
    setDesktopMode,
    breakpointLabel,
  } = useInterLinkedTheme();

  const desktopClosed = desktopMode === "closed";
  const desktopMini = desktopMode === "mini";

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
            width: {
              base: grid.navBarWidth,
              [breakpointLabel]: desktopMini ? grid.navBarMiniWidth : grid.navBarWidth,
            },
            breakpoint: breakpointLabel,
            collapsed: {
              mobile: !navbarOpened,
              desktop: desktopClosed,
            },
          }
      }
      styles={{
        navbar: {
          overflow: "hidden",
          background: isDark
            ? "rgba(36, 36, 36, 0.65)"
            : "rgba(200, 200, 200, 0.65)",
          backdropFilter: "blur(14px) saturate(1.2)",
          WebkitBackdropFilter: "blur(14px) saturate(1.2)",
        },
      }}
    >
      {/* MOBILE burger */}
      {!hasNavbar && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 7,
            height: grid.rowHeight,
            display: "flex",
            alignItems: "center",
            zIndex: grid.z.top + 1,
          }}
        >
          <Burger
            opened={navbarOpened}
            onClick={toggleNavbar}
            size="sm"
            lineSize={navbarOpened ? 3 : 2}
            aria-label="Toggle navigation"
            color="var(--interlinked-color-primary-soft)"
          />
        </Box>
      )}

      {/* DESKTOP navbar mini/normal */}
      {!hideSite && !desktopClosed && (
        <AppShell.Navbar p={0} withBorder={false} style={{ zIndex: grid.z.top }}>
          <AppNavbar
            desktopMini={desktopMini}
            toggleNavbar={() => {
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

      {/* DESKTOP right-edge toggle rail */}
      {!hideSite && hasNavbar && !desktopClosed && (
        <Box
          visibleFrom={breakpointLabel}
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
            <IconChevronLeft size={18} stroke={2} color="var(--interlinked-color-suppressed)" />
          ) : (
            <IconChevronRight size={18} stroke={2} color="var(--interlinked-color-suppressed)" />
          )}
        </Box>
      )}

      <AppShell.Main>
        <Box style={flow.gate.gateStyle}>{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
