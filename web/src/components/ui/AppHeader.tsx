import { Group, Title, ActionIcon, Button, Tooltip, Burger, useMantineColorScheme } from "@mantine/core";
import { IconDownload, IconMoon, IconSun } from "@tabler/icons-react";

const appVersion = (window as any).__APP_VERSION__ ?? 'dev';

type Props = {
    opened: boolean;
    onToggleNav: () => void;
}

export function AppHeader({ opened, onToggleNav }: Props) {
    const { colorScheme, setColorScheme } = useMantineColorScheme();

    return (
        <Group h="100%" px="md" justify="space-between">
            <Group>
                {/* Hamburger menu for mobile */}
                <Burger opened={opened} onClick={onToggleNav} hiddenFrom="sm" size="sm" />
                <Title order={3}>Syncnite</Title>
            </Group>

            <Group gap="sm">
                {/* Download extension button */}
                <Tooltip withArrow label={`Download Syncnite v${appVersion} (.pext)`}>
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
