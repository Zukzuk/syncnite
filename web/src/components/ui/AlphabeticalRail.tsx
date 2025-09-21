import { Paper, Stack, Tooltip, UnstyledButton } from "@mantine/core";
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
    const usable = counts ? letters.filter((ch) => (counts[ch] ?? 0) > 0) : letters;
    if (usable.length === 0) return null;

    return (
        <Paper
            component="nav"
            aria-label={title}
            radius="xl"
            withBorder
            shadow="sm"
            style={{
                position: "absolute",
                right: 15,
                top: "50%",
                transform: "translateY(-50%)",
                width: 28,
                padding: "6px 2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
            }}
        >
            <Stack gap={2} align="center" justify="center">
                {usable.map((ch) => {
                    const isActive = !!active && active.toUpperCase() === ch;
                    return (
                        <Tooltip key={ch} label={ch} position="left" withArrow>
                            <UnstyledButton
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => onJump(ch)}
                                style={{
                                    fontSize: 11,
                                    lineHeight: 1,
                                    padding: "3px 0",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    userSelect: "none",
                                    opacity: isActive ? 1 : 0.8,
                                    fontWeight: isActive ? 700 : 400,
                                    color: isActive ? "var(--mantine-primary-color-4)" : "inherit",
                                }}
                            >
                                {ch}
                            </UnstyledButton>
                        </Tooltip>
                    );
                })}
            </Stack>
        </Paper>
    );
}
