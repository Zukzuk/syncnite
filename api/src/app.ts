import express from "express";
import router from "./routes";

export function createApp() {
    const app = express();
    app.use(express.json({ limit: "50mb" }));
    app.use(router);
    return app;
}
