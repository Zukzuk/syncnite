import { Box } from '@mantine/core';
import DOMPurify from 'dompurify';
import { memo, useMemo } from 'react';

import classes from './HtmlBox.module.css';
import { InterLinkedGrid } from '../types/interlinked';

let policy: TrustedTypePolicy | null = null;

function toTrustedHTML(html: string): TrustedHTML | string {
    if (typeof window === 'undefined') return DOMPurify.sanitize(html);

    if (window.trustedTypes) {
        policy ??= window.trustedTypes.createPolicy('dompurify', {
            createHTML: (input) => DOMPurify.sanitize(input),
        });
        return policy.createHTML(html);
    }

    return DOMPurify.sanitize(html);
}

type Props = { grid: InterLinkedGrid; html?: string };

export const HtmlBox = memo(function HtmlBox({ grid, html }: Props) {
    const safe = useMemo(() => toTrustedHTML(html ?? ''), [html]);

    return (
        <Box
            pr={grid.gap}
            className={classes.root}
            dangerouslySetInnerHTML={{ __html: safe }}
        />
    );
});
