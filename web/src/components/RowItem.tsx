import { Box, Flex, Text, Group, } from "@mantine/core";
import { GRID } from "../lib/constants";
import { Item } from "../features/hooks/useLibrary";
import { IconActionOverlay } from "./IconActionOverlay";
import { IconImage } from "./IconImage";
import { ExternalLink } from "./ExternalLink";
import { IconSourceLink } from "./IconSourceLink";
import { CopyTitle } from "./CopyTitle";

type Props = {
    item: Item;
    collapseOpen: boolean;
};

export function RowItem({ item, collapseOpen }: Props) {
    const { id, isInstalled, iconUrl, title, gameId, year,
        source, tags, series, link, isHidden,
    } = item;

    return (
        <Box
            style={{
                display: "grid",
                gridTemplateColumns: GRID.colsList,
                alignItems: "center",
                gap: 12,
                height: GRID.rowHeight,
            }}
        >
            <Flex align="center" gap={8} className={isHidden ? " is-dim" : ""} style={{ width: GRID.smallBox }}>
                <Box className="icon-wrap" style={{ position: "relative", width: GRID.smallBox, height: GRID.smallBox }}>
                    <IconActionOverlay installed={isInstalled} href={`playnite://play/${id}`} title={title}>
                        <Box className="icon-base">
                            <IconImage src={iconUrl ?? ""} />
                        </Box>
                    </IconActionOverlay>
                </Box>
            </Flex>

            <Flex gap={8} className={isHidden ? " is-dim" : ""} style={{ minWidth: 0 }}>
                <Text
                    fw={600}
                    title={title}
                    className="item-title"
                    style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: collapseOpen ? 20 : undefined,
                        transition: "font-size 140ms ease",
                    }}
                >
                    {title}
                </Text>

                {/* push utility icons to the far right */}
                <Box style={{ marginLeft: "auto" }}>
                    <CopyTitle title={title} year={year} />
                </Box>
            </Flex>

            <Box className={isHidden ? " is-dim" : ""} ta="center">
                {year && (
                    <Text style={{ fontSize: 14 }}>{year}</Text>
                )}
            </Box>

            <Box className={isHidden ? " is-dim" : ""}>
                <Group gap={6} wrap="nowrap" style={{ justifyContent: "center" }}>
                    <ExternalLink source={source} link={link} title={title} />
                    <IconSourceLink source={source} gameId={gameId} link={link} />
                </Group>
            </Box>

            <Flex gap={8} className={isHidden ? " is-dim" : ""} style={{ minWidth: 0 }}>
                <Text
                    fw={600}
                    title={title}
                    className="game-series"
                    style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {series && series.length > 0 ? series.join(", ") : ""}
                </Text>
            </Flex>

            {/* <Box className={isHidden ? " is-dim" : ""} style={{ display: collapseOpen ? "none" : undefined }}>
                <Group gap={6} align="center" wrap="wrap" style={{ maxHeight: GRID.rowHeight, overflow: "hidden" }}>
                    {(tags ?? []).map((t) => (
                        <Badge key={t} variant="dark" size="sm">
                            {t}
                        </Badge>
                    ))}
                </Group>
            </Box> */}
        </Box>
    );
}