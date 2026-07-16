import { Router } from "express";
import { config } from "../config.js";
import { runDailyQuestGeneration, runNextDayQuestGeneration } from "../cron/daily-quests.js";

export const internalRoutes = Router();

function authorized(req: { headers: Record<string, unknown> }): boolean {
  const secret = req.headers["x-internal-secret"];
  return Boolean(config.INTERNAL_CRON_SECRET) && secret === config.INTERNAL_CRON_SECRET;
}

// Manual cron triggers (backup for the in-process node-cron schedules).
internalRoutes.post("/cron/daily-quests", async (req, res, next) => {
  try {
    if (!authorized(req)) return res.status(401).json({ ok: false, error: "unauthorized" });
    const result = await runDailyQuestGeneration();
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});

internalRoutes.post("/cron/next-day-quests", async (req, res, next) => {
  try {
    if (!authorized(req)) return res.status(401).json({ ok: false, error: "unauthorized" });
    const result = await runNextDayQuestGeneration();
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});
