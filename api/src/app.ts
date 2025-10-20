import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import type { Request, Response } from "express";
import syncRouter from "./routes/sync";
import accountsRouter from "./routes/accounts";
import generalRouter from "./routes/general";
import backupRouter from "./routes/backup";
import extensionRouter from "./routes/extension";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { requestLogger } from "./middleware/requestLogger";
import { createOpenApiMockRouter } from "./openapi/mocks";

export function createApp() {
    const app = express();
    const APP_VERSION = process.env.APP_VERSION ?? 'dev';

    // trust proxy if running behind nginx
    app.set("trust proxy", true);

    // basic request logging (method, url, status, ms)
    app.use(requestLogger());

    // increase JSON body size limit for large backups
    app.use(express.json({ limit: "50mb" }));

    // Swagger/OpenAPI setup
    const swaggerSpec = swaggerJsdoc({
        definition: {
            openapi: "3.0.0",
            info: { title: "Syncnite Web API", version: APP_VERSION, description: "API for Syncnite and extension integration" },
            components: {
                securitySchemes: {
                    XAuthEmail: {
                        type: "apiKey",
                        in: "header",
                        name: "x-auth-email",
                        description: "Admin email for header auth"
                    },
                    XAuthPassword: {
                        type: "apiKey",
                        in: "header",
                        name: "x-auth-password",
                        description: "Admin password for header auth"
                    }
                },
            }
        },
        apis: [path.join(__dirname, "/openapi/spec.{ts,js}")],
    });
    app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));
    app.use(
        "/api/docs",
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
            swaggerOptions: {
                persistAuthorization: true,
                authAction: {
                    XAuthEmail: {
                        name: "x-auth-email",
                        schema: { type: "apiKey", in: "header", name: "x-auth-email" },
                        value: "dave.timmerman@gmail.com",
                    },
                    XAuthPassword: {
                        name: "x-auth-password",
                        schema: { type: "apiKey", in: "header", name: "x-auth-password" },
                        value: "xxxx",
                    },
                },
            },
        })
    );

    // Mock API routes
    if (process.env.MOCKS === "spec") {
        // SSE is special: stream a deterministic sequence for the web UI
        app.get("/api/sse", (req: Request, res: Response) => {
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

        // Everything else under /api comes from the OpenAPI mocker
        createOpenApiMockRouter(swaggerSpec).then((mockRouter) => {
            app.use("/api", mockRouter);
        });
    }


    // routes
    app.use("/api", generalRouter);
    app.use("/api/accounts", accountsRouter);
    app.use("/api/sync", syncRouter);
    app.use("/api/backup", backupRouter);
    app.use("/api/extension", extensionRouter);

    // 404 + error handler
    app.use(notFoundHandler());
    app.use(errorHandler());

    return app;
}
