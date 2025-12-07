import { Paper, Stack, Button, rem } from "@mantine/core";
import { LETTERS_LIST, Z_INDEX } from "../../../lib/constants";
import { getTheme } from "../../../lib/utils";
import { Letter } from "../../../types/types";

type Props = {
    activeLetter: Letter;
    railCounts: Record<Letter, number>;
    onScrollJump: (letter: Letter) => void;
};

// Component to display an alphabetical rail for quick navigation in the library view.
export function AlphabeticalRail({ activeLetter, railCounts, onScrollJump }: Props): JSX.Element | null {
    const letters = LETTERS_LIST.filter((l) => (railCounts[l] ?? 0) > 0);
    if (letters.length < 10) return null;

    const { theme, isDark } = getTheme();
    const backgroundColor = isDark ? theme.colors.dark[6] : theme.white;

    return (
        <Paper
            component="nav"
            aria-label="Jump to letter"
            radius="xl"
            withBorder
            shadow="sm"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "absolute",
                right: 15,
                top: "50%",
                width: rem(22),
                padding: "8px 0",
                zIndex: Z_INDEX.high,
                background: backgroundColor,
                transform: "translateY(-50%)",
                transition: "background-color 140ms ease",
            }}
        >
            <Stack gap={2} align="stretch" justify="center" style={{ width: "100%" }}>
                {letters.map((letter) => {
                    const isActive = activeLetter.toUpperCase() === letter;
                    return (
                        <Button
                            type="button"
                            variant={isActive ? "filled" : "subtle"}
                            color="var(--interlinked-color-primary)"
                            size="compact-xs"
                            fullWidth
                            radius={0}
                            onClick={() => onScrollJump(letter)}
                            aria-pressed={isActive}
                            style={{
                                height: rem(16),
                                padding: 0,
                                fontSize: rem(11),
                                lineHeight: 1,
                                fontWeight: isActive ? 300 : 100,
                                justifyContent: "center",
                                userSelect: "none",
                                transition: "background-color 140ms ease, color 140ms ease",
                            }}
                        >
                            {letter}
                        </Button>
                    );
                })}
            </Stack>
        </Paper>
    );
}
