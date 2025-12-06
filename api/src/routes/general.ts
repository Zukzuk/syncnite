import express from "express";
import { PING_CONNECTED_MS } from "../constants";
import { rootLog } from "../logger";
import { createSSE } from "../sse";
import { SyncBus } from "../services/EventBusService";
import { AccountsService } from "../services/AccountsService";
import { requireSession } from "../middleware/requireAuth";

const router = express.Router();
const log = rootLog.child("route:app");
const APP_VERSION = process.env.APP_VERSION ?? "dev";

let LAST_PING = 0;
let LAST_EXT_VERSION: string | null = null;

// Update the last ping time for the admin associated with the given email
async function setConnectedLabel(email: string, extVersion: string | null) {
  try {
    const role = await AccountsService.getRole(email);
    if (role === "admin") {
      LAST_PING = Date.now();
      LAST_EXT_VERSION = extVersion;
    } else {
      // not an admin, don't track as connected
      LAST_PING = 0;
      LAST_EXT_VERSION = null;
    }
  } catch {
    LAST_PING = 0;
    LAST_EXT_VERSION = null;
  }
}

/**
 * GET /api/v1/ping
 * Ping endpoint to check server availability and update admin connection status.
 * The extension should send its version in the `x-ext-version` header.
 */
router.get("/ping", requireSession, (_req, res) => {
  const email = _req.auth?.email as string | undefined;
  const extVersion = (_req.header("x-ext-version") ?? null) as string | null;

  if (email) {
    // fire and forget
    void setConnectedLabel(email, extVersion);
  }

  return res.json({ ok: true, version: `v${APP_VERSION}` });
});

/**
 * GET /api/v1/ping/status
 * Returns the connection status of the admin + version info.
 */
router.get("/ping/status", requireSession, (req, res) => {
  const now = Date.now();
  const connected = !!LAST_PING && now - LAST_PING <= PING_CONNECTED_MS;

  const appVersion = APP_VERSION;
  const extVersion = LAST_EXT_VERSION;

  const normalize = (v?: string | null) =>
    (v ?? "").trim().replace(/^v/i, "");

  const appNorm = normalize(appVersion);
  const extNorm = normalize(extVersion);
  const hasBoth = !!appNorm && !!extNorm;
  const versionMismatch = hasBoth && appNorm !== extNorm;

  return res.json({
    ok: true,
    connected,
    extVersion,
    versionMismatch,
    lastPingAt: LAST_PING ? new Date(LAST_PING).toISOString() : null,
  });
});

/**
 * POST /api/v1/log
 * Accepts log entries from clients.
 */
router.post("/log", async (req, res) => {
  try {
    const count = log.raw(req.body);
    if (!count) return res.status(400).json({ ok: false, error: "invalid payload" });

    log.debug("log accepted", { count });
    return res.sendStatus(204);
  } catch (e) {
    log.error("log failed", { err: (e as Error).message });
    return res.status(400).json({ ok: false, error: "invalid log payload" });
  }
});

/**
 * GET /api/v1/sse
 * Server-Sent Events endpoint for streaming sync progress and logs to clients.
 */
router.get("/sse", (req, res) => {
  const sse = createSSE(res);

  // Stream current + future events to this client
  const unsub = SyncBus.subscribe((ev) => {
    if (ev.type === "progress") sse.progress(ev.data);
    else if (ev.type === "log") sse.log(ev.data);
    else if (ev.type === "done") sse.done();
  });

  // welcome line (optional)
  sse.log("connected to api/sse");

  // cleanup on disconnect
  req.on("close", () => {
    try { unsub(); } catch { }
    try { sse.close(); } catch { }
  });
});

export default router;
