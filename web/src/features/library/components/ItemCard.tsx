import { Box, Group, Image, Text } from "@mantine/core";
import { GameItem } from "../../../types/types";
import { IconIsInstalled } from "../../../components/IconIsInstalled";
import { IconIsHidden } from "../../../components/IconIsHidden";
import { IconCopyTitle } from "../../../components/IconCopyTitle";
import { IconLinkExternal } from "../../../components/IconExternalLink";
import { IconLinkSource } from "../../../components/IconSourceLink";

type Props = {
    item: GameItem;
    isOpen: boolean;
};

// Card component for a library item in grid view.
export function ItemCard({ item, isOpen }: Props): JSX.Element {
    const { title, coverUrl, year, source, link, gameId, isHidden, isInstalled } = item;

    return (
        <>
            <Box style={{
                position: "relative",
                aspectRatio: "23 / 32",
            }}>
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
                {title}
            </Text>

            <Box
                m={6}
                mt={0}
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
                        gap={6}
                        align="center"
                        wrap="nowrap"
                        style={{ justifyContent: "center" }}
                    >
                        <IconCopyTitle
                            title={title}
                            year={year}
                        />
                        <IconLinkExternal
                            source={source}
                            link={link}
                            title={title}
                        />
                        <IconLinkSource
                            source={source}
                            gameId={gameId}
                            link={link}
                        />
                    </Group>
                </Box>
            </Box>
        </>
    );
}
