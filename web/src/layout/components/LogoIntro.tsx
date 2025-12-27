import { CSSProperties, memo, useEffect, useState } from "react";
import { Stack, Text } from "@mantine/core";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";

import styles from "./LogoIntro.module.css";

type Props = {
  onDone?: () => void;
  exiting?: boolean;
  desktopMini?: boolean;
  /** default = top-left; loginHero = big centered logo above card */
  variant?: "default" | "loginHero";
};

export const LogoIntro = memo(function LogoIntro({
  onDone,
  exiting,
  desktopMini = false,
  variant = "default",
}: Props) {
  const { hasNavbar, isDark } = useInterLinkedTheme();

  const [animated, setAnimated] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setAnimated(false);
      onDone?.();
    }, 1400);
    return () => window.clearTimeout(t);
  }, [onDone]);

  const isHero = variant === "loginHero";

  // Position/scale knobs (fed into CSS via variables)
  const left = isHero ? "50%" : `${hasNavbar ? 14 : 40}px`;
  const top = isHero ? "42px" : "20px";
  const translateX = isHero ? "-50%" : "0px";
  const scale = isHero ? 1.65 : 1.0;

  // Precompute scales (avoid CSS var multiplication)
  const scaleIn = scale * 0.98;
  const scaleSettleUp = scale * 1.01;
  const scaleOut25 = scale * 0.99;
  const scaleOut55 = scale * 0.975;
  const scaleOut100 = scale * 0.94;

  return (
    <Stack
      className={styles.logoWrap}
      data-animated={animated ? "true" : "false"}
      data-exiting={exiting ? "true" : "false"}
      gap={0}
      style={
        {
          ["--logo-left" as any]: left,
          ["--logo-top" as any]: top,
          ["--logo-translate-x" as any]: translateX,

          ["--logo-scale" as any]: String(scale),
          ["--logo-scale-in" as any]: String(scaleIn),
          ["--logo-scale-settle-up" as any]: String(scaleSettleUp),

          ["--logo-scale-out-25" as any]: String(scaleOut25),
          ["--logo-scale-out-55" as any]: String(scaleOut55),
          ["--logo-scale-out-100" as any]: String(scaleOut100),
        } as CSSProperties
      }
    >
      <Text
        truncate
        ff="Cyber City"
        className={styles.logoInter}
        style={{
          fontSize: 22,
          width: "fit-content",
          color: isDark
            ? "var(--interlinked-color-primary-soft)"
            : "var(--interlinked-color-primary)",
        }}
      >
        <span className={styles.logoGlitch} data-text="Inter">
          { desktopMini ? "In" : "Inter" }
        </span>
      </Text>

      <Text
        truncate
        ff="Cyber City"
        className={styles.logoLinked}
        style={{
          fontSize: 13,
          left: desktopMini ? 25 : 34,
          top: -2,
          width: "fit-content",
          color: "var(--interlinked-color-secondary)",
        }}
      >
        <span className={styles.logoGlitch} data-text="LINKED">
          { desktopMini ? "LI" : "LINKED" }
        </span>
      </Text>
    </Stack >
  );
});
