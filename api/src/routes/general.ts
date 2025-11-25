import express from "express";
import { PING_CONNECTED_MS, UPLOADS_DIR } from "../constants";
import { rootLog } from "../logger";
import { createSSE } from "../sse";
import { SyncBus } from "../services/EventBusService";
import { AccountsService } from "../services/AccountsService";
import { requireSession } from "../middleware/requireAuth";

const router = express.Router();
const log = rootLog.child("route:app");

let LAST_PING = 0;

// Update the last ping time for the admin associated with the given email
async function setConnectedLabel(email: string) {
    try {

        const role = await AccountsService.getRole(email);
        if (role === "admin") LAST_PING = Date.now();
    } catch {
        LAST_PING = 0;
    }
}

router.get("/ping", requireSession, (_req, res) => {
    const APP_VERSION = process.env.APP_VERSION ?? "dev";
    const email = _req.auth?.email;
    
    setConnectedLabel(email as string); // fire and forget

    return res.json({ ok: true, version: `v${APP_VERSION}` });
});

router.get("/ping/status", requireSession, (req, res) => {
    const now = Date.now();
    const connected = !!LAST_PING && now - LAST_PING <= PING_CONNECTED_MS;

    return res.json({
        ok: true,
        connected,
        lastPingAt: LAST_PING ? new Date(LAST_PING).toISOString() : null,
    });
});

router.post("/log", async (req, res) => {
  try {
    const count = log.raw(req.body);
    if (!count) return res.status(400).json({ ok: false, error: "invalid payload" });
    
    log.debug("sync/log accepted", { count });
    return res.sendStatus(204);
  } catch (e) {
    log.error("sync/log failed", { err: (e as Error).message });
    return res.status(400).json({ ok: false, error: "invalid log payload" });
  }
});

router.get("/sse", (req, res) => {
  const sse = createSSE(res);

  // Stream current + future events to this client
  const unsub = SyncBus.subscribe((ev) => {
    if (ev.type === "progress") sse.progress(ev.data);
    else if (ev.type === "log") sse.log(ev.data);
    else if (ev.type === "done") sse.done();
  });

  // welcome line (optional)
  sse.log("connected to api/sync/sse");

  // cleanup on disconnect
  req.on("close", () => {
    try { unsub(); } catch {}
    try { sse.close(); } catch {}
  });
});

export default router;
