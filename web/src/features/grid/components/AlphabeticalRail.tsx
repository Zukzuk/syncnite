import { useState } from "react";
import { Paper, Stack, Button, rem } from "@mantine/core";
import { InterLinkedGrid } from "../../../types/interlinked";
import { Letter } from "../../../types/app";
import { LETTERS_LIST } from "../../../constants";

type Props = {
    grid: InterLinkedGrid;
    activeLetter: Letter;
    railCounts: Record<Letter, number>;
    onScrollJump: (letter: Letter) => void;
};

// Component to display an alphabetical rail for quick navigation in the library view.
export function AlphabeticalRail({ activeLetter, railCounts, onScrollJump, grid }: Props): JSX.Element | null {
    const letters = LETTERS_LIST.filter((l) => (railCounts[l] ?? 0) > 0);
    if (letters.length < 10) return null;

    const [hoveredLetter, setHoveredLetter] = useState<Letter | null>(null);

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
                zIndex: grid.z.high,
                transform: "translateY(-50%)",
                transition: "background-color 140ms ease",
            }}
        >
            <Stack
                gap={2}
                align="stretch"
                justify="center"
                style={{ width: "100%" }}
            >
                {letters.map((letter) => {
                    const isActive = activeLetter.toUpperCase() === letter;
                    const isHovered = hoveredLetter === letter;

                    return (
                        <Button
                            type="button"
                            size="compact-xs"
                            variant="transparent"
                            fullWidth
                            radius={0}
                            aria-pressed={isActive}
                            style={{
                                padding: 0,
                                height: rem(16),
                                fontSize: rem(11),
                                lineHeight: 1,
                                userSelect: "none",
                                justifyContent: "center",
                                fontWeight: isActive || isHovered ? 700 : 100,
                                color: isActive || isHovered
                                    ? "var(--interlinked-color-secondary)"
                                    : "var(--interlinked-color-primary)",
                                transition: "background-color 140ms ease, color 140ms ease",
                            }}
                            onMouseEnter={() => setHoveredLetter(letter)}
                            onMouseLeave={() => setHoveredLetter(null)}
                            onClick={() => onScrollJump(letter)}
                        >
                            {letter}
                        </Button>
                    );
                })}
            </Stack>
        </Paper>
    );
}
