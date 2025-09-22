import { Stack, Text, Card, List, Alert } from "@mantine/core";

export default function BridgePage() {

    return (
        <Stack gap="lg" p="md">
            <Text fz={24} fw={700}>Bridge</Text>

            <Alert variant="light" color="gray" title="About this page">
                Connect Playnite with the ViewerBridge extension. The extension will sync your local installed games list to the web viewer.
            </Alert>

            <Card withBorder>
                <List spacing="sm">
                    <List.Item>
                        <Text><strong>Download</strong> the ViewerBridge .pext and drag it onto your Playnite window to install.</Text>
                    </List.Item>
                    <List.Item>
                        <Text>Restart Playnite if asked. Keep Playnite running to let the extension communicate.</Text>
                    </List.Item>
                </List>

            </Card>
        </Stack>
    );
}
