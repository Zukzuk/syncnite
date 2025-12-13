import { Group, Text, Code } from "@mantine/core";

type Props = {
    label?: React.ReactNode;
    value?: React.ReactNode;
    icon?: React.ReactNode;
    size?: "xs" | "sm";
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