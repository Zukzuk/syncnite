
import { memo } from "react";
import { Button, CSSProperties, Tooltip } from "@mantine/core";
import { ButtonTypes } from "../types/types";

type Props = {
    type: ButtonTypes;
    label?: string;
    text?: string;
    href?: string;
    icon?: JSX.Element;
    style?: CSSProperties;
    loading?: boolean;
    onClick?: () => void;
};

export const IconButton = memo(function IconButton({
    label,
    text,
    icon,
    style,
    type,
    href,
    loading,
    onClick,
}: Props) {
    
    const button = (
        <Button
            component={type === "button" || type === "link" ? "a" : undefined}
            type={type === "submit" ? "submit" : undefined}
            onClick={type === "button" ? onClick : undefined}
            href={type === "link" ? href : undefined}
            loading={loading === null || loading === undefined ? false : loading}
            size="xs"
            radius={0}
            variant="light"
            justify="space-between"
            rightSection={<span />}
            leftSection={icon}
            style={{ ...style }}
        >
            {text}
        </Button>
    );

    return (
        <>
            { label &&
                <Tooltip withArrow label={label} style={{ fontSize: 10 }}>
                    {button}
                </Tooltip>
            }
            { !label && button }
        </>
    );
});