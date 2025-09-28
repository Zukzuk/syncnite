import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import syncRouter from "./routes/sync";
import backupRouter from "./routes/backup";
import extensionRouter from "./routes/extension";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { requestLogger } from "./middleware/requestLogger";

export function createApp() {
    const app = express();

    // trust proxy if running behind nginx
    app.set("trust proxy", true);

    // basic request logging (method, url, status, ms)
    app.use(requestLogger());

    const swaggerSpec = swaggerJsdoc({
        definition: {
            openapi: "3.0.0",
            info: {
                title: "Syncnite Web API",
                version: "1.0.0",
                description: "API for Syncnite and extension integration",
            },
            components: {
                schemas: {
                    LogEvent: {
                        type: "object",
                        properties: {
                            ts: { type: "string", format: "date-time" },
                            level: { type: "string", enum: ["trace", "debug", "info", "warn", "error"] },
                            kind: { type: "string", description: "category like decision, health, push, sync, alert" },
                            msg: { type: "string" },
                            data: { type: "object", additionalProperties: true },
                            err: { type: "string" },
                            ctx: { type: "object", additionalProperties: true }
                        },
                        required: ["msg"]
                    }
                }
            }
        },
        apis: [
            path.join(__dirname, "routes/*.{ts,js}"),
        ],
    });

    app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    app.use(express.json({ limit: "50mb" }));

    // routes
    app.use("/api/syncnite/live", syncRouter);
    app.use("/api/syncnite/backup", backupRouter);
    app.use("/api/extension", extensionRouter);

    // 404 + error handler
    app.use(notFoundHandler());
    app.use(errorHandler());

    return app;
}
