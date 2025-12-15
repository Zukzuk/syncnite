import React from "react";
import { Stack, Text } from "@mantine/core"
import { getTheme } from "../theme";

export const Logo = React.memo(function IconLinkSource() {
    const { isDesktop, isDark } = getTheme();

    return (
        <Stack
            gap={0}
            style={{
                position: "absolute",
                display: "block",
                top: 20,
                height: 36,
                width: 120,
                overflow: "hidden",
                transform: "skewY(-6deg)", 
                transformOrigin: "middle middle",
                WebkitFontSmoothing: "antialiased",
                left: isDesktop ? 14 : 40,
            }}>
            <Text
                truncate
                ff="Cyber City"
                style={{
                    position: "relative",
                    fontSize: 22,
                    width: "fit-content",
                    color: isDark ? "var(--interlinked-color-primary-soft)" : "var(--interlinked-color-primary)",
                }}
            >
                Inter
            </Text>
            <Text
                truncate
                ff="Cyber City"
                style={{
                    position: "relative",
                    fontSize: 13,
                    left: 34,
                    top: -12,
                    width: "fit-content",
                    color: "var(--interlinked-color-secondary)",
                }}
            >
                LINKED
            </Text>
        </Stack>
    );
});