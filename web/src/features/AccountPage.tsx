import { Container, Stack, Text } from "@mantine/core";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";
import AccountCard from "../features/account/AccountCard";
import PlayniteCard from "../features/account/PlayniteCard";
import SteamCard from "../features/account/SteamCard";

export default function AccountPage(): JSX.Element {
    const { hasNavbar, grid } = useInterLinkedTheme();

    return (
        <Container size="sm" pt={hasNavbar ? "lg" : grid.rowHeight} pb="lg">
            <Stack gap="lg">

                <Stack gap={4}>
                    <Text fz={28} fw={700}>
                        My account
                    </Text>
                    <Text size="sm" c="dimmed">
                        Manage your InterLinked account and connected services.
                    </Text>
                </Stack>
                
                <AccountCard />
                <PlayniteCard />
                <SteamCard />
            </Stack>
        </Container>
    );
}