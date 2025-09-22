import {
    Group,
    Title,
    ActionIcon,
    Button,
    Tooltip,
    Burger,
    useMantineColorScheme
} from "@mantine/core";
import { IconSun, IconMoon, IconDownload } from "../../lib/icons";
import { AppHeaderProps } from "../../lib/types";

export function AppHeader({ opened, onToggleNav }: AppHeaderProps) {
    const { colorScheme, setColorScheme } = useMantineColorScheme();

    return (
        <Group h="100%" px="md" justify="space-between">
            <Group>
                <Burger opened={opened} onClick={onToggleNav} hiddenFrom="sm" size="sm" />
                <Title order={3}>Playnite Viewer</Title>
            </Group>

            <Group gap="sm">
                {/* Download button */}
                <Tooltip label="Download ViewerBridge extension (.pext)">
                    <Button
                        component="a"
                        href="/api/extension/download"
                        size="sm"
                        radius="xl"
                        leftSection={<IconDownload size={16} />}
                        variant="filled"
                        fw={600}
                    >
                        Playnite extension
                    </Button>
                </Tooltip>

                {/* Dark / light toggle */}
                <ActionIcon
                    variant="subtle"
                    aria-label="Toggle color scheme"
                    onClick={() =>
                        setColorScheme(colorScheme === "dark" ? "light" : "dark")
                    }
                    size="lg"
                >
                    {colorScheme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
                </ActionIcon>
            </Group>
        </Group>
    );
}
