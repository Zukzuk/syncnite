import { Box } from '@mantine/core';
import DOMPurify from 'dompurify';
import { memo, useMemo } from 'react';
import classes from './HtmlBox.module.css';
import { InterLinkedGrid } from '../types/interlinked';
import { MIN_WORDS_PER_COLUMN } from '../constants';

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

function countWordsFromHtml(html: string): number {
    // crude but effective: remove tags, collapse whitespace, count tokens
    const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return text ? text.split(' ').length : 0;
}

type Props = {
    grid: InterLinkedGrid;
    html: string;
    colsFitAtMaxWidth: number;
    stackCardWidthUsed: number;
};

export const HtmlBox = memo(function HtmlBox({
    grid,
    html,
    colsFitAtMaxWidth,
    stackCardWidthUsed,
}: Props) {
    const safeHTML = useMemo(() => toTrustedHTML(html), [html]);
    const words = useMemo(() => countWordsFromHtml(html), [html]);

    // Your “normal” number of CSS columns (based on 3 grid cols per stack column)
    const baseColumnCount = Math.max(1, Math.ceil(colsFitAtMaxWidth / 3));
    // Reduce columns if too little content
    const maxColumnsByWords = Math.max(1, Math.floor(words / MIN_WORDS_PER_COLUMN));
    const columnCount = Math.min(baseColumnCount, maxColumnsByWords);
    // Calculate max width to avoid overly wide columns
    const maxWidth = columnCount * stackCardWidthUsed * 3;

    return (
        <Box
            pr={grid.gap}
            className={classes.root}
            maw={columnCount !== baseColumnCount ? maxWidth : undefined}
            style={{
                columnCount,
                columnGap: grid.gapMd,
            }}
            dangerouslySetInnerHTML={{ __html: safeHTML }}
        />
    );
});
