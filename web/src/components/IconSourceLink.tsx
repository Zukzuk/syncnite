import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCalculatorFilled, IconDeviceGamepadFilled, IconDeviceUnknownFilled } from "@tabler/icons-react";
import { InterLinkedItem } from "../types/interlinked";
import { CustomIconSVG } from "./CustomIcon";
import { CustomIconType } from "../types/app";
import { SOURCE_COLLECTION } from "../constants";

type Props = Pick<InterLinkedItem, "source" | "sourceLink">;

export const IconLinkSource = memo(function IconLinkSource({
    source,
    sourceLink,
}: Props) {
    if (!sourceLink) return null;

    return (
        <Tooltip
            style={{ fontSize: 10 }}
            label={`${SOURCE_COLLECTION[source].platform?.split("://")[0]}://`}
            withArrow
            position="top"
        >
            <ActionIcon
                component="a"
                rel="noopener"
                href={sourceLink ?? ""}
                aria-label={`Goto game in ${source}`}
                onClick={(e) => e.stopPropagation()}
                variant="subtle"
                size="sm"
                style={{ lineHeight: 0, height: "100%", display: "flex", alignItems: "center" }}
            >
                {source === "emulator" ? (
                    <IconCalculatorFilled size={14} />
                ) : (
                    source === "abandonware" ? (
                        <IconDeviceGamepadFilled size={14} />
                    ) :
                        source === "fallback" ? (
                            <IconDeviceUnknownFilled size={14} />
                        ) : (
                            <CustomIconSVG type={source as CustomIconType} size={14} />
                        )
                )
                }
            </ActionIcon>
        </Tooltip>
    );
});
