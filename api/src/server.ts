import { createApp } from "./app";

const APP_VERSION = process.env.APP_VERSION ?? 'dev';

const app = createApp(APP_VERSION);
const port = process.env.PORT ? Number(process.env.PORT) : 3004;

const server = app.listen(port, () => {
    console.log(`API listening on ${port}`);
});

process.on("SIGTERM", () => {
    console.log("SIGTERM received, closing server…");
    server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
    console.log("SIGINT received, closing server…");
    server.close(() => process.exit(0));
});
