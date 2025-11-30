import { Box } from '@mantine/core';
import { GRID, Z_INDEX } from '../../../lib/constants';
import { Letter } from '../../../types/types';

type Props = { letter: Letter; top: number };

export function AlphabeticalSeparatorRow({ letter, top }: Props): JSX.Element {
  return (
    <Box
      h={GRID.halfRowHeight}
      style={{
        position: 'sticky',
        zIndex: Z_INDEX.base,
        fontWeight: 600,
        padding: '6px 12px 6px 64px',
        background: 'var(--mantine-color-body)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
        top,
      }}
    >
      {letter}
    </Box>
  );
}