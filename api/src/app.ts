import express from "express";
import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import syncRouter from "./routes/sync";
import accountsRouter from "./routes/accounts";
import generalRouter from "./routes/general";
import extensionRouter from "./routes/extension";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { requestLogger } from "./middleware/requestLogger";
import { createOpenApiMockRouter } from "./openapi/mocks";

export function createApp() {
    const app = express();

    // env APP_VERSION, else root package.json, else "dev"
    const rootPkgPath = path.resolve(__dirname, "..", "..", "package.json");
    let pkgVersion = "dev";
    try {
        pkgVersion = JSON.parse(fs.readFileSync(rootPkgPath, "utf8")).version ?? "dev";
    } catch { /* fall back */ }
    const APP_VERSION = process.env.APP_VERSION ?? pkgVersion;

    // trust proxy if running behind nginx
    app.set("trust proxy", true);
    // basic request logging (method, url, status, ms)
    app.use(requestLogger());
    // increase JSON body size limit for large backups
    app.use(express.json({ limit: "50mb" }));

    // Swagger/OpenAPI setup (see endpoints in ./openapi/openapi.yaml)
    const swaggerSpec = swaggerJsdoc({
        definition: {
            openapi: "3.1.0",
            urls: ["/api/v1"],
            info: {
                title: "Syncnite Web API",
                version: APP_VERSION,
                description: "API for Syncnite and extension integration",
            },
            components: {
                securitySchemes: {
                    XAuthEmail: { type: "apiKey", in: "header", name: "x-auth-email", description: "Admin email for header auth" },
                    XAuthPassword: { type: "apiKey", in: "header", name: "x-auth-password", description: "Admin password for header auth" },
                    XClientId: { type: "apiKey", in: "header", name: "x-client-id", description: "Client ID for identifying different clients" },
                },
            },
        },
        // Load YAML + TS/JS (see below)
        apis: [path.join(__dirname, "/openapi/**/*.{yaml,yml}")]
    });
    // Swagger UI setup with pre-filled auth headers for convenience
    app.use(
        "/api/v1/docs",
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
            swaggerOptions: {
                persistAuthorization: true,
                authAction: {
                    XAuthEmail: { name: "x-auth-email", schema: { type: "apiKey", in: "header", name: "x-auth-email" }, value: "dave" },
                    XAuthPassword: { name: "x-auth-password", schema: { type: "apiKey", in: "header", name: "x-auth-password" }, value: "xxxx" },
                    XClientId: { name: "x-client-id", schema: { type: "apiKey", in: "header", name: "x-client-id" }, value: "my-client-id" },
                },
            },
        })
    );
    // Mock API routes
    if (process.env.MOCKS === "spec") {
        // SSE is special: stream a deterministic sequence for the web UI
        app.get("/api/v1/sse", (req: Request, res: Response) => {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
            });
            const write = (event: string, data: any) => {
                res.write(`event: ${event}\n`);
                res.write(`data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`);
            };
            write("log", "connected to mock sse");
            let p = 0;
            const t = setInterval(() => {
                p += 25;
                if (p < 100) {
                    write("progress", { phase: "backup", percent: p });
                    write("log", `progress ${p}%`);
                } else {
                    write("progress", { phase: "backup", percent: 100 });
                    write("done", "");
                    clearInterval(t);
                    try { res.end(); } catch { }
                }
            }, 150);
            req.on("close", () => { try { clearInterval(t); } catch { } });
        });

        // Everything else under /api/v1 comes from the OpenAPI mocker
        createOpenApiMockRouter(swaggerSpec).then((mockRouter) => {
            app.use("/api/v1", mockRouter);
        });
    }
    // Serve raw OpenAPI spec JSON
    app.get("/api/v1/docs.json", (_req, res) => res.json(swaggerSpec));

    // routes
    app.use("/api/v1", generalRouter);
    app.use("/api/v1/accounts", accountsRouter);
    app.use("/api/v1/sync", syncRouter);
    app.use("/api/v1/extension", extensionRouter);

    // 404 + error handler
    app.use(notFoundHandler());
    app.use(errorHandler());

    return app;
}