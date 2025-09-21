import express from "express";
import path from "path";
import playniteLiveRouter from "./routes/playnitelive";
import playniteDumpRouter from "./routes/playnitedump";
import extensionRouter from "./routes/extension";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

export function createApp() {
    const app = express();

    const swaggerSpec = swaggerJsdoc({
        definition: {
            openapi: "3.0.0",
            info: {
                title: "Playnite Web API",
                version: "1.0.0",
                description: "API for Playnite web viewer and extension integration",
            },
        },

        apis: [
            path.join(__dirname, "routes/*.{ts,js}"),
            path.join(process.cwd(), "api", "src", "routes", "*.{ts,js}"),
        ],
    });

    app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec)); // handy
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    app.use(express.json({ limit: "50mb" }));
    app.use("/api/playnitelive", playniteLiveRouter);
    app.use("/api/playnitedump", playniteDumpRouter);
    app.use("/api/extension", extensionRouter);
    return app;
}
