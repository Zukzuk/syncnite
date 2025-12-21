import { memo } from "react";
import { ActionIcon } from "@mantine/core"
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";

export const IconThemeSwitch = memo(function IconThemeSwitch() {
    const { isDark, setColorScheme } = useInterLinkedTheme();
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