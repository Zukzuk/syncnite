import { createApp } from "./app";
import { rootLog } from "./logger";
import { resetAllSteamWishlistSyncFlags } from "./services/SteamWishlistStore";

const app = createApp();
const port = process.env.PORT ? Number(process.env.PORT) : 3004;
const log = rootLog.child("server");

async function start() {
    // Ensure no leftover sync flags from crash or restart
    await resetAllSteamWishlistSyncFlags();
    log.info("Steam wishlist sync flags reset on startup");

    const server = app.listen(port, () => {
        log.info("started", { port });
    });

    // graceful shutdown handlers
    process.on("SIGTERM", () => {
        log.info("received SIGTERM");
        server.close(() => process.exit(0));
    });

    process.on("SIGINT", () => {
        log.info("received SIGINT");
        server.close(() => process.exit(0));
    });
}

// Start the process (and catch fatal startup errors)
start().catch((err) => {
    log.error("Fatal startup error", { err });
    process.exit(1);
});
