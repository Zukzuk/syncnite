import * as React from "react";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null };
    static getDerivedStateFromError(error: Error) { return { error }; }

    render() {
        if (!this.state.error) return this.props.children;
        const stack = this.state.error.stack || `${this.state.error.name}: ${this.state.error.message}`;
        return (
            <div style={{ padding: 16, fontFamily: "monospace" }}>
                <h2>Something went wrong</h2>
                <pre style={{ whiteSpace: "pre-wrap" }}>{stack}</pre>
            </div>
        );
    }
}
