import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCalculatorFilled, IconDeviceGamepadFilled, IconDeviceUnknownFilled } from "@tabler/icons-react";
import { InterLinkedGameItem } from "../types/interlinked";
import { PLAYNITE_SOURCE_MAP } from "../services/PlayniteService";
import { CustomIconSVG } from "./CustomIcon";
import { CustomIconType } from "../types/app";

type Props = Pick<InterLinkedGameItem, "source" | "sourceLink">;

export const IconLinkSource = memo(function IconLinkSource({
    source,
    sourceLink,
}: Props) {
    if (!sourceLink) return null;

    return (
        <Tooltip
            style={{ fontSize: 10 }}
            label={PLAYNITE_SOURCE_MAP[source ?? ""]?.platform}
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
