import { Box, Group, Image, Text } from "@mantine/core";
import { CopyTitle } from "../../../components/CopyTitle";
import { ExternalLink } from "../../../components/ExternalLink";
import { IconSourceLink } from "../../../components/IconSourceLink";
import { GameItem } from "../../../types/types";

type Props = {
    item: GameItem;
    isOpen: boolean;
};

export function ItemCard({ item, isOpen }: Props): JSX.Element {

    const { title, coverUrl, year, source, link, gameId } = item;

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
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "fill",
                    }}
                />
            </Box>

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
                        <CopyTitle
                            title={title}
                            year={year}
                        />
                        <ExternalLink
                            source={source}
                            link={link}
                            title={title}
                        />
                        <IconSourceLink
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
