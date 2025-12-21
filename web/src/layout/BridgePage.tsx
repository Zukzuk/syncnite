import { Stack, Button, Textarea, Text, Container } from "@mantine/core";
import { SectionCard } from "../components/SectionCard";
import { useLogBus } from "../hooks/useLogBus";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";

export default function BridgePage(): JSX.Element {
    const logBus = useLogBus();
    const { hasMenu, grid } = useInterLinkedTheme();

    return (
        <Container size="sm" pt={hasMenu ? "lg" : grid.rowHeight} pb="lg">
            <Stack gap="lg">

                <SectionCard
                    title="Logs"
                    action={
                        <Button variant="subtle" onClick={logBus.clear} aria-label="Clear logs">
                            Clear
                        </Button>
                    }
                >
                    <Text size="xs" c="dimmed">Newest on top</Text>
                    <Textarea
                        value={logBus.text}
                        maxRows={20}
                        autosize
                        styles={{ input: { fontFamily: "ui-monospace, Menlo, Consolas, monospace" } }}
                    />
                </SectionCard>

            </Stack>
        </Container>
    );
}
