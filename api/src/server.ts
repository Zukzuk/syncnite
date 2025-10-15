import { createApp } from "./app";
import { rootLog } from "./logger";

const app = createApp();
const port = process.env.PORT ? Number(process.env.PORT) : 3004;
const log = rootLog.child("server");

const server = app.listen(port, () => {
    log.info("started", { port });
});

process.on("SIGTERM", () => {
    log.info("received SIGTERM");
    server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
    log.info("received SIGINT");
    server.close(() => process.exit(0));
});
