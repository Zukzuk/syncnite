import express from "express";
import { ListZipsService } from "../services/ListZipsService";
import { UPLOADS_DIR } from "../constants";
import { rootLog } from "../logger";
import { createSSE } from "../sse";
import { SyncBus } from "../services/EventBusService";

const router = express.Router();
const listZipsService = new ListZipsService(UPLOADS_DIR);
const log = rootLog.child("route:app");

router.get("/zips", async (_req, res) => {
    log.info("zips: request received");
    try {
        const zips = await listZipsService.get();
        log.info(`zips: found ${zips.length} zip(s)`);
        res.json(zips);
    } catch (e: any) {
        log.error("zips: failed:", String(e?.message || e));
        res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
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
