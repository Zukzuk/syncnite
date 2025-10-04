import { Stack, Progress, Text } from "@mantine/core";

type Props = {
  label: string; percent: number | null; subtext?: string
}

export function LoadingBar({ label, percent, subtext }: Props) {
  if (percent == null) return null;
  return (
    <Stack gap={4}>
      <Text size="sm">
        {label} {Math.round(percent)}% {subtext ? `(${subtext})` : ""}
      </Text>
      <Progress value={percent} />
    </Stack>
  );
}
