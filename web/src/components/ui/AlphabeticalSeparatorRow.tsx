import { Box } from '@mantine/core';
import { Z_INDEX } from '../../lib/constants';

type Props = { bucket: string; top: number };

export function AlphabeticalSeparatorRow({ bucket, top }: Props) {
  return (
    <Box
      style={{
        position: 'sticky',
        zIndex: Z_INDEX.seperatorRow,
        fontWeight: 700,
        padding: '6px 12px 6px 80px',
        background: 'var(--mantine-color-body)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
        top, // from props
      }}
    >
      {bucket}
    </Box>
  );
}