import { useRouteError, isRouteErrorResponse } from "react-router-dom";

export default function RouteError() {
    const err = useRouteError();

    const title = isRouteErrorResponse(err)
        ? `${err.status} ${err.statusText}`
        : err instanceof Error
            ? `${err.name}: ${err.message}`
            : "Route error";

    const details = isRouteErrorResponse(err)
        ? JSON.stringify(err.data ?? {}, null, 2)
        : err instanceof Error
            ? err.stack || String(err)
            : String(err);

    return (
        <div style={{ padding: 16, fontFamily: "monospace" }}>
            <h2>{title}</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>{details}</pre>
        </div>
    );
}
