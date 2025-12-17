import React from "react";
import { Center, Container, Loader, Stack } from "@mantine/core";
import Markdown from "../../components/Markdown";
import { getTheme } from "../../theme";
import { GRID } from "../../lib/constants";

export default function HomePage(): JSX.Element {
    const [readmeData, setReadmeData] = React.useState<string | null>(null);
    const { isDesktop } = getTheme();

    React.useEffect(() => {
        fetch("/README.md")
            .then((r) => r.text())
            .then(setReadmeData)
            .catch(() => setReadmeData("# README not found"));
    }, []);

    if (!readmeData) {
        return (
            <Stack style={{ height: "100%", minHeight: 0 }}>
                <Center w={`calc(100vw - ${isDesktop ? GRID.navBarWidth : 0}px)`} h={`calc(100vh)`}>
                    <Loader size="md" type="bars" />
                </Center>
            </Stack>
        );
    }

    return (
        <Container size="sm" pt={isDesktop ? "lg" : GRID.rowHeight} pb="lg">
            <Markdown content={readmeData} />
        </Container>
    );
}
