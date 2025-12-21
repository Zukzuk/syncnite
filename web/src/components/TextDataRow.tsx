import { ReactNode } from "react";
import { Group, Text, Code, MantineSize } from "@mantine/core";

type Props = {
    label?: ReactNode;
    value?: ReactNode;
    icon?: ReactNode;
    size?: MantineSize;
};

export function TextDataRow({ label, value, icon, size = "sm" }: Props): JSX.Element {
    return (
        <Group gap="xs" align="center">
            {icon}
            {label && (
                <Text size={size} c="dimmed" fw={500}>
                    {label}
                </Text>
            )}
            <Code>{value ?? "(unknown)"}</Code>
        </Group>
    );
}