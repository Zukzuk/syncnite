import { Alert, Stack, Text } from "@mantine/core";

export default function HomePage() {
  return (
    <Stack gap="lg" p="md">
      <Text fz={28} fw={700}>Home</Text>
      
      <Alert variant="light" color="gray" title="About this page">
        Welcome to your shared game library
      </Alert>
    </Stack>
  );
}