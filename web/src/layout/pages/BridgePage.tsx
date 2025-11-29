import React from "react";
import { Stack, Button, Textarea, Text } from "@mantine/core";
import { SectionCard } from "../../components/SectionCard";
import { useLogBus } from "../../hooks/useLogBus";

export default function BridgePage(): JSX.Element {
    const logBus = useLogBus();

    return (
        <Stack gap="lg" p="md">
            <SectionCard
                title="Logs"
                right={
                    <Button variant="subtle" onClick={logBus.clear} aria-label="Clear logs">
                        Clear
                    </Button>
                }
            >
                <Textarea
                    value={logBus.text}
                    maxRows={20}
                    autosize
                    styles={{ input: { fontFamily: "ui-monospace, Menlo, Consolas, monospace" } }}
                />
                <Text size="xs">Newest on top</Text>
            </SectionCard>

        </Stack>
    );
}
