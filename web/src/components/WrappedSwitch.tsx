import { Text, Flex, Switch } from "@mantine/core"
import { memo } from "react";

type Props = {
    label: string;
    ariaLabel?: string;
    checked: boolean;
    toggle: (v: boolean) => void;
}

export const WrappedSwitch = memo(function WrappedSwitch({
    label,
    ariaLabel,
    checked,
    toggle,
}: Props) {
    return (
        <Flex
            h={47}
            direction="column"
            align="center"
            justify="center"
            style={{
                alignSelf: "stretch"
            }}
        >
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