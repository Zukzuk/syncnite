import { Box } from '@mantine/core';

export function AlphabeticalSeparatorRow({ bucket, top }: { bucket: string; top: number }) {
  return (
    <Box
      style={{
        position: 'sticky',
        zIndex: 1,
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