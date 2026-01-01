import { Badge, Box, Group, Image, Text } from "@mantine/core";
import { InterLinkedGameItem, InterLinkedGrid } from "../../../types/interlinked";
import { IconIsInstalled } from "../../../components/IconIsInstalled";
import { IconIsHidden } from "../../../components/IconIsHidden";
import { IconCopyTitle } from "../../../components/IconCopyTitle";
import { IconLinkOrigin } from "../../../components/IconOriginLink";
import { IconLinkSource } from "../../../components/IconSourceLink";
import { IconLinkExternal } from "../../../components/IconExternalLink";

type Props = {
    item: InterLinkedGameItem;
    isOpen: boolean;
    grid: InterLinkedGrid;
    isListView: boolean;
};

// Card component for a library item in grid view.
export function ItemCard({ item, isOpen, isListView, grid }: Props): JSX.Element | null {
    if (isOpen || isListView) return null;

    const { title, coverUrl, year, source, htmlLink, sourceLink, isHidden,
        isInstalled, origin, originRunLink, id, titleWithoutVersion, version
    } = item;

    return (
        <Box
            aria-label="item-card"
        >
            <Box
                style={{
                    position: "relative",
                    aspectRatio: grid.ratio,
                }}
            >
                <Image
                    src={coverUrl || ""}
                    alt={title}
                    fit="fill"
                    loading="lazy"
                    radius={4}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "fill",
                    }}
                />
            </Box>

            <IconIsInstalled
                isListView={false}
                isInstalled={isInstalled}
            />

            <IconIsHidden
                isListView={false}
                isHidden={isHidden}
            />

            <Text
                size="sm"
                m={6}
                lineClamp={2}
                title={title}
                fw={600}
                h={40}
                style={{
                    fontSize: isOpen ? 20 : undefined,
                    transition: "font-size 140ms ease",
                }}
            >
                {titleWithoutVersion}&nbsp;{version ? (
                    <Badge
                        size="xs"
                        variant="outline"
                        color="var(--interlinked-color-primary)"
                        style={{ display: "inline-block", position: "relative", top: 3 }}
                    >
                        {version}
                    </Badge>
                ) : null}
            </Text>

            <Box
                m={6}
                mt={0}
                h={22}
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "relative",
                }}
            >
                <Box>
                    {year && <Text style={{ fontSize: 12 }}>{year}</Text>}
                </Box>

                <Box>
                    <Group
                        gap={0}
                        mr={4}
                        align="center"
                        wrap="nowrap"
                        style={{ justifyContent: "center" }}
                    >
                        <IconCopyTitle title={title} year={year} />
                        <IconLinkOrigin origin={origin} originRunLink={originRunLink} id={id} />
                        {origin !== source && <IconLinkSource source={source} sourceLink={sourceLink} />}
                        <IconLinkExternal htmlLink={htmlLink} title={title} />
                    </Group>
                </Box>
            </Box>
        </Box>
    );
}
