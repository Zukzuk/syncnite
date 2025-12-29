
import { memo } from "react";
import { Button, CSSProperties, Tooltip, Text } from "@mantine/core";
import { ButtonTypes } from "../types/app";

type Props = {
    type: ButtonTypes;
    label?: string;
    text?: string;
    href?: string;
    icon?: JSX.Element;
    style?: CSSProperties;
    loading?: boolean;
    disabled?: boolean;
    onClick?: () => void;
};

export const IconButton = memo(function IconButton({
    label,
    text,
    icon,
    style,
    type,
    href,
    loading = false,
    disabled = false,
    onClick,
}: Props) {

    const button = (
        <Button
            component={type === "button" || type === "link" ? "a" : undefined}
            type={type === "submit" ? "submit" : undefined}
            onClick={type === "button" ? onClick : undefined}
            href={type === "link" ? href : undefined}
            disabled={disabled}
            loading={loading === null || loading === undefined ? false : loading}
            loaderProps={{ type: 'dots' }}
            size="xs"
            radius={0}
            variant="light"
            justify="space-between"
            rightSection={text && icon ? <span /> : undefined}
            leftSection={text && icon ? icon : undefined}
            style={{ ...style }}
        >
            {text ? text : icon ? icon : null}
        </Button>
    );

    return (
        <>
            {label &&
                <Tooltip withArrow label={label} style={{ fontSize: 10 }}>
                    {button}
                </Tooltip>
            }
            {!label && button}
        </>
    );
});