import React from "react";
import { Container, Loader } from "@mantine/core";
import Markdown from "../../components/Markdown";
import { getTheme } from "../../theme";
import { GRID } from "../../lib/constants";

export default function HomePage(): JSX.Element {
    const [content, setContent] = React.useState<string | null>(null);
    const { isDesktop } = getTheme();

    React.useEffect(() => {
        fetch("/README.md")
            .then((r) => r.text())
            .then(setContent)
            .catch(() => setContent("# README not found"));
    }, []);

    if (!content) return <Loader />;

    return (
        <Container size="sm" pt={isDesktop ? "lg" : GRID.rowHeight} pb="lg">
            <Markdown content={content} />
        </Container>
    );
}
