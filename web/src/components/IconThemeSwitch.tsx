import React from "react";
import { ActionIcon } from "@mantine/core"
import { getTheme } from "../theme";
import { IconMoon, IconSun } from "@tabler/icons-react";

export const IconThemeSwitch = React.memo(function IconThemeSwitch() {
    const { isDark, setColorScheme } = getTheme();
    const toggleColorScheme = () => setColorScheme(isDark ? "light" : "dark");


    return (
        <ActionIcon
            variant="subtle"
            onClick={toggleColorScheme}
            color={isDark ? "var(--interlinked-color-secondary)" : "var(--interlinked-color-primary)"}
            size="md"
        >
            {isDark ? (
                <IconSun color="var(--interlinked-color-secondary)" size={18} />
            ) : (
                <IconMoon color="var(--interlinked-color-primary)" size={18} />
            )}
        </ActionIcon>
    );
});