import { Text, Flex, Tooltip, SegmentedControl } from "@mantine/core"
import { memo } from "react";

type Props = {
    leftIsActive: boolean;
    tooltip?: {
        left: string;
        right: string;
    };
    label?: {
        left: string;
        right: string;
    };
    readOnly?: boolean;
    width?: number;
    value: string;
    data: { value: string; label: string }[];
    onChange: (value: string) => void;
}

export const WrappedSegmentedControl = memo(function WrappedSegmentedControl({
    leftIsActive,
    tooltip,
    label,
    readOnly = false,
    width,
    value,
    data,
    onChange,
}: Props) {
    const segmentedControl = (
        <SegmentedControl
            value={value}
            size="xs"
            radius="sm"
            w={width ? width : undefined}
            color="var(--interlinked-color-primary)"
            onChange={onChange}
            readOnly={readOnly && value === "disabled" ? true : false}
            data={data}
        />
    );

    const tooltippedSegmentedControl = tooltip ? (
        <Tooltip
            label={leftIsActive
                ? tooltip.left
                : tooltip.right
            }
            withArrow
            position="bottom"
            style={{ fontSize: 10 }}
        >
            {segmentedControl}
        </Tooltip>
    ) : null;

    return (
        <Flex
            h={47}
            direction="column"
            align="center"
            justify="center"
            style={{ alignSelf: "stretch" }}
        >
            {tooltip ? tooltippedSegmentedControl : segmentedControl}
            {label &&
                <Text c="dimmed" style={{ fontSize: 10 }}>
                    {leftIsActive
                        ? label.left
                        : label.right
                    }
                </Text>
            }
        </Flex>
    );
});