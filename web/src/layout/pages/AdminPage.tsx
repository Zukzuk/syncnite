import * as React from "react";
import { Stack, Text, Badge, Container } from "@mantine/core";
import { useAuth } from "../../hooks/useAuth";
import { GRID } from "../../lib/constants";
import { TextDataRow } from "../../components/TextDataRow";
import { SectionCard } from "../../components/SectionCard";
import { getTheme } from "../../theme";

export default function AdminPage(): JSX.Element {
    const { state } = useAuth({ pollMs: 0 });
    const { isDesktop } = getTheme();

    return (
        <Container size="sm" pt={isDesktop ? "lg" : GRID.rowHeight } pb="lg">
            <Stack gap="lg">

                <Text fz={28} fw={700}>
                    Administration
                </Text>
                <Text size="sm" c="dimmed">
                    Manage your InterLinked admin account.
                </Text>

                <SectionCard
                    title="Admin"
                    subtitle="Currently maximum of 1 admin per server"
                    action={
                        <Badge
                            color="var(--interlinked-color-success)"
                            variant="filled"
                            size="sm"
                        >
                            active
                        </Badge>
                    }
                >
                    <TextDataRow 
                        label="Signed in as" 
                        value={state.email ?? "(unknown)"} 
                    />
                </SectionCard>
            </Stack>
        </Container>
    );
}
