import { Box, Group, Image, Text } from "@mantine/core";
import { CopyTitle } from "./CopyTitle";
import { ExternalLink } from "./ExternalLink";
import { IconSourceLink } from "./IconSourceLink";
import { Item } from "../features/library/hooks/useLibrary";

type Props = {
    item: Item;
    collapseOpen: boolean;
};

export function GridItem({ item, collapseOpen }: Props) {
    return (
        <div /* no outer Card here, wrapper gives border/padding */>
            <div style={{ position: "relative", aspectRatio: "23 / 32" }}>
                <Image
                    src={item.coverUrl || ""}
                    alt={item.title}
                    fit="contain"
                    loading="lazy"
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                    }}
                />
            </div>

            <Text
                size="sm"
                m={6}
                lineClamp={2}
                title={item.title}
                fw={600}
                h={40}
                style={{
                    fontSize: collapseOpen ? 20 : undefined,
                    transition: "font-size 140ms ease",
                }}
            >
                {item.title}
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
                    {item.year && <Text style={{ fontSize: 12 }}>{item.year}</Text>}
                </Box>

                <Box>
                    <Group
                        gap={6}
                        align="center"
                        wrap="nowrap"
                        style={{ justifyContent: "center" }}
                    >
                        <CopyTitle 
                            title={item.title} 
                            year={item.year} 
                        />
                        <ExternalLink
                            source={item.source}
                            link={item.link}
                            title={item.title}
                        />
                        <IconSourceLink
                            source={item.source}
                            gameId={item.gameId}
                            link={item.link}
                        />
                    </Group>
                </Box>
            </Box>
        </div>
    );
}
