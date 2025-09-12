import { Paper, Stack, Text, Tooltip } from "@mantine/core";
import { AlphabeticalRailCounts } from "../../lib/types";

export const DEFAULT_LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];

export function AlphabeticalRail({
    letters = DEFAULT_LETTERS,
    counts,
    active,
    onJump,
    title = "Jump to letter",
}: {
    letters?: string[];
    counts?: AlphabeticalRailCounts;
    active?: string | null;
    onJump: (letter: string) => void;
    title?: string;
}) {
    const usable = counts
        ? letters.filter((ch) => (counts[ch] ?? 0) > 0)
        : letters;

    if (usable.length === 0) return null;

    return (
        <Paper className="alphabetical-rail" radius="xl" withBorder shadow="sm" aria-label={title}>
            <Stack gap={2} align="center" justify="center">
                {usable.map((ch) => {
                    const isActive = !!active && active.toUpperCase() === ch;
                    return (
                        <Tooltip key={ch} label={ch} position="left" withArrow>
                            <Text
                                component="button"
                                type="button"
                                className={["item", isActive ? "active" : ""].join(" ")}
                                onClick={() => onJump(ch)}
                                aria-pressed={isActive}
                            >
                                {ch}
                            </Text>
                        </Tooltip>
                    );
                })}
            </Stack>
        </Paper>
    );
}
