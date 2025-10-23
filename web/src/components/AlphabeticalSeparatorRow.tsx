import { Box } from '@mantine/core';
import { GRID, Z_INDEX } from '../lib/constants';

type Props = { bucket: string; top: number };

export function AlphabeticalSeparatorRow({ bucket, top }: Props) {
  return (
    <Box
      h={GRID.smallBox}
      style={{
        position: 'sticky',
        zIndex: Z_INDEX.seperatorRow,
        fontWeight: 600,
        padding: '6px 12px 6px 64px',
        background: 'var(--mantine-color-body)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
        top,
      }}
    >
      {bucket}
    </Box>
  );
}