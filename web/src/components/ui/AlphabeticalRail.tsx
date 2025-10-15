import { Paper, Stack, Button, rem } from "@mantine/core";
import { LETTERS_LIST, Z_INDEX } from "../../lib/constants";
import { getTheme } from "../../lib/utils";

export type AlphabeticalRailCounts = Record<string, number>;

type Props = {
    letters?: string[];
    counts?: AlphabeticalRailCounts;
    active?: string | null;
    onJump: (letter: string) => void;
    title?: string;
};

export function AlphabeticalRail({
    letters = LETTERS_LIST,
    counts, active, onJump,
    title = "Jump to letter",
}: Props) {
    const usable = counts ? letters.filter((ch) => (counts[ch] ?? 0) > 0) : letters;
    if (usable.length < 10) return null;

    const { theme, isDark } = getTheme();
    const backgroundColor = isDark ? theme.colors.dark[6] : theme.white;

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
                padding: "8px 0",
                transform: "translateY(-50%)",
                width: rem(22),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: Z_INDEX.rail,
                background: backgroundColor,
                transition: "background-color 120ms ease",
            }}
        >
            <Stack gap={2} align="stretch" justify="center" style={{ width: "100%" }}>
                {usable.map((ch) => {
                    const isActive = !!active && active.toUpperCase() === ch;
                    return (
                        <Button
                            type="button"
                            variant={isActive ? "filled" : "subtle"}
                            color={theme.primaryColor}
                            size="compact-xs"
                            fullWidth
                            radius={0}
                            onClick={() => onJump(ch)}
                            aria-pressed={isActive}
                            style={{
                                height: rem(16),
                                padding: 0,
                                fontSize: rem(11),
                                lineHeight: 1,
                                fontWeight: isActive ? 300 : 100,
                                justifyContent: "center",
                                userSelect: "none",
                                transition: "background-color 120ms ease, color 120ms ease",
                            }}
                        >
                            {ch}
                        </Button>
                    );
                })}
            </Stack>
        </Paper>
    );
}
