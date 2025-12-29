import { memo } from "react";
import { ActionIcon } from "@mantine/core"
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";

type Props = {
    size?: number;
    actionSize?: number;
}

export const IconThemeSwitch = memo(function IconThemeSwitch({
    size = 18, actionSize
}: Props): JSX.Element {
    const { isDark, setColorScheme } = useInterLinkedTheme();
    const toggleColorScheme = () => setColorScheme(isDark ? "light" : "dark");


    return (
        <ActionIcon
            variant="subtle"
            onClick={toggleColorScheme}
            color={isDark ? "var(--interlinked-color-secondary)" : "var(--interlinked-color-primary)"}
            size="md"
            w={actionSize ? actionSize : undefined}
            h={actionSize ? actionSize : undefined}
        >
            {isDark ? (
                <IconSun color="var(--interlinked-color-secondary)" size={size} />
            ) : (
                <IconMoon color="var(--interlinked-color-primary)" size={size} />
            )}
        </ActionIcon>
    );
});