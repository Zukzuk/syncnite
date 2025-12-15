import React from "react";
import { Text, Flex, Switch } from "@mantine/core"

type Props = {
    label: string;
    ariaLabel?: string;
    checked: boolean;
    toggle: (v: boolean) => void;
}

export const IconToggleWithLabel = React.memo(function IconToggleWithLabel({
    label,
    ariaLabel,
    checked,
    toggle,
}: Props) {
    return (
        <Flex direction="column" align="center" justify="center" style={{ alignSelf: "stretch" }}>
            <Switch
                aria-label={ariaLabel ?? label}
                checked={checked}
                onChange={(e) => toggle(e.currentTarget.checked)}
                size="xs"
                radius="md"
                pb={4}
            />
            <Text c="dimmed" style={{ fontSize: 10 }}>{label}</Text>
        </Flex>
    );
});