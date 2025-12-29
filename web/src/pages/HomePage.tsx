import { useEffect, useState } from "react";
import { Center, Container, Loader, Stack } from "@mantine/core";
import Markdown from "../features/markdown/Markdown";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";

export default function HomePage(): JSX.Element {
    const [readmeData, setReadmeData] = useState<string | null>(null);
    const { hasNavbar, grid, mantine, isDark } = useInterLinkedTheme();

    useEffect(() => {
        fetch("/README.md")
            .then((r) => r.text())
            .then(setReadmeData)
            .catch(() => setReadmeData("# README not found"));
    }, []);

    if (!readmeData) {
        return (
            <Stack style={{ height: "100%", minHeight: 0 }}>
                <Center w={`calc(100vw - ${hasNavbar ? grid.navBarWidth : 0}px)`} h={`calc(100vh)`}>
                    <Loader size="md" type="bars" />
                </Center>
            </Stack>
        );
    }

    return (
        <Container 
            size="sm" 
            pt={hasNavbar ? "lg" : grid.rowHeight} 
            pb="lg"
            style={{
                minWidth: grid.minSiteWidth,
            }}
        >
            <Markdown content={readmeData} mantine={mantine} isDark={isDark} />
        </Container>
    );
}
