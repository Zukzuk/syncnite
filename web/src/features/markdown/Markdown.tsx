import { Children, isValidElement, ReactNode } from "react";
import {
    TypographyStylesProvider,
    Anchor as MantineAnchor,
    Code as MantineCode,
    ScrollArea,
    MantineTheme,
} from "@mantine/core";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

/** Helper to flatten children to text */
function toText(node: ReactNode): string {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(toText).join("");
    if (isValidElement(node)) return toText(node.props.children);
    return "";
}

type Props = {
    content: string;
    mantine: MantineTheme;
    isDark: boolean;
};

export default function Markdown({ content, mantine, isDark }: Props): JSX.Element {
    const border = isDark ? mantine.colors.dark[4] : mantine.colors.gray[3];
    const zebra = isDark ? mantine.colors.dark[6] : mantine.colors.gray[0];

    // Inline code (react-markdown v9 only uses this for inline)
    const CodeRenderer: Components["code"] = ({ children, ...props }) => (
        <MantineCode {...props}>{children}</MantineCode>
    );

    // Fenced code blocks (<pre><code>...</code></pre>)
    const PreRenderer: Components["pre"] = ({ children, ...props }) => {
        const childArray = Children.toArray(children);
        const first = childArray[0] as ReactNode;

        // get className from inner <code> for syntax highlighting
        let className = "";
        if (isValidElement(first) && typeof first.props.className === "string") {
            className = first.props.className;
        }

        // flatten to text & trim final newline
        const raw = toText(first);
        const trimmed = raw.replace(/\n$/, "");

        return (
            <ScrollArea.Autosize mah={420}>
                <pre
                    {...props}
                    style={{
                        padding: mantine.spacing.md,
                        border: `1px solid ${border}`,
                        borderRadius: mantine.radius.md,
                        margin: `${mantine.spacing.sm} 0`,
                        overflow: "auto",
                    }}
                >
                    <code className={className}>{trimmed}</code>
                </pre>
            </ScrollArea.Autosize>
        );
    };

    // Links
    const LinkRenderer: Components["a"] = ({ href, title, children }) => (
        <MantineAnchor href={href ?? "#"} title={title ?? undefined} target="_blank" rel="noreferrer">
            {children}
        </MantineAnchor>
    );

    // Tables
    const TableRenderer: Components["table"] = (props) => (
        <div style={{ overflowX: "auto", margin: `${mantine.spacing.sm} 0` }}>
            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: `1px solid ${border}`,
                }}
                {...props}
            />
        </div>
    );

    const ThRenderer: Components["th"] = (props) => (
        <th
            style={{
                textAlign: "left",
                padding: `${mantine.spacing.xs} ${mantine.spacing.sm}`,
                borderBottom: `1px solid ${border}`,
                borderRight: `1px solid ${border}`,
                background: zebra,
                fontWeight: 600,
                whiteSpace: "nowrap",
            }}
            {...props}
        />
    );

    const TdRenderer: Components["td"] = (props) => (
        <td
            style={{
                padding: `${mantine.spacing.xs} ${mantine.spacing.sm}`,
                borderBottom: `1px solid ${border}`,
                borderRight: `1px solid ${border}`,
                verticalAlign: "top",
            }}
            {...props}
        />
    );

    const components: Components = {
        a: LinkRenderer,
        code: CodeRenderer, // inline code
        pre: PreRenderer,   // fenced code
        table: TableRenderer,
        th: ThRenderer,
        td: TdRenderer,
    };

    return (
        <TypographyStylesProvider>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={components}
            >
                {content}
            </ReactMarkdown>

            <style>{`
        table tr:nth-of-type(odd) td { background: ${zebra}; }
        table th:last-child, table td:last-child { border-right: none; }
      `}</style>
        </TypographyStylesProvider>
    );
}
