import * as React from "react";
import { ActionIcon, Card, Center, Indicator, Tooltip } from "@mantine/core";
import { Link } from "react-router-dom";
import { getTheme } from "../theme";

type Props = {
    tooltip: string;
    dotColor?: string;
    icon?: React.ReactNode;
    compIcon?: React.ReactNode;
    toggleNavbar?: () => void;
}

export function ControlPanelTile({
    tooltip,
    dotColor,
    icon,
    compIcon,
    toggleNavbar,
}: Props) {
    const { hasMenu } = getTheme();
    const hasToggle = !!toggleNavbar;

    return (
        <Tooltip
            withArrow
            style={{ fontSize: 10 }}
            label={tooltip}
        >
            <Indicator
                size={12}
                withBorder
                color={dotColor}
                disabled={!dotColor}
            >
                <Card
                    withBorder
                    radius="sm"
                    p="sm"
                    style={{
                        height: 38,
                        width: 38,
                        background: "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Center>
                        {icon ? (
                            <ActionIcon
                                component={Link}
                                onClick={!hasMenu && hasToggle ? toggleNavbar : undefined}
                                to="/account"
                                variant="subtle"
                                size="md"
                                w={38}
                                h={38}
                            >
                                {icon}
                            </ActionIcon>
                        ) : (compIcon)}
                    </Center>
                </Card>
            </Indicator>
        </Tooltip>
    );
}