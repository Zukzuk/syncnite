import type { ReactNode } from "react";
import { Card, Group, ThemeIcon, Text, Divider, Box } from "@mantine/core";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";

type Props = {
    title: string;
    children: ReactNode;
    icon?: ReactNode;
    subtitle?: string;
    action?: ReactNode;
};

export function SectionCard({ icon, title, subtitle, action, children }: Props) {
    const { grid } = useInterLinkedTheme();
    
    return (
        <Card withBorder shadow="sm" radius="md" style={{ position: "relative" }}>
            <Group justify="space-between" align="flex-start" mb="sm">
                <Group gap="sm">
                    {icon ? (
                        <ThemeIcon radius="xl" variant="light">
                            {icon}
                        </ThemeIcon>
                    ) : null}
                    <>
                        <Text fw={600}>{title}</Text>
                        {subtitle ? (
                            <Text size="xs" c="dimmed">{subtitle}</Text>
                        ) : null}
                    </>
                </Group>

                {action ? (
                    <Box
                        style={{
                            position: "absolute",
                            top: grid.gap,
                            right: grid.gap
                        }}
                    >
                        {action}
                    </Box>
                ) : null}
            </Group>

            <Divider my="sm" />
            {children}
        </Card>
    );
}
