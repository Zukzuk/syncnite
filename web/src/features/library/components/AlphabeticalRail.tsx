import { Paper, Stack, Button, rem } from "@mantine/core";
import { LETTERS_LIST, Z_INDEX } from "../../../lib/constants";
import { getTheme } from "../../../lib/utils";
import { Letter } from "../../../types/types";

type Props = {
    activeLetter: Letter;
    onScrollJump: (letter: Letter) => void;
    railCounts: Record<Letter, number>;
};

export function AlphabeticalRail({activeLetter, onScrollJump, railCounts}: Props): JSX.Element | null {
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
                {letters.map((letter) => {
                    const isActive = activeLetter.toUpperCase() === letter;
                    return (
                        <Button
                            type="button"
                            variant={isActive ? "filled" : "subtle"}
                            color={theme.primaryColor}
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
                                transition: "background-color 120ms ease, color 120ms ease",
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
