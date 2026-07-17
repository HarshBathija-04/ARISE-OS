import { Router } from "express";
import { config } from "../config.js";
import { runDailyQuestGeneration, runNextDayQuestGeneration } from "../cron/daily-quests.js";
import { schedulerTick } from "../services/scheduler.service.js";
import { runDailyResetForAll } from "../services/daily-reset.service.js";

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

// One scheduler tick: materialize scheduled_notifications + dispatch due rows.
internalRoutes.post("/cron/scheduler-tick", async (req, res, next) => {
  try {
    if (!authorized(req)) return res.status(401).json({ ok: false, error: "unauthorized" });
    const result = await schedulerTick();
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});

// Force the daily reset for every user (normally per-user via the scheduler).
internalRoutes.post("/cron/daily-reset", async (req, res, next) => {
  try {
    if (!authorized(req)) return res.status(401).json({ ok: false, error: "unauthorized" });
    const result = await runDailyResetForAll();
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});
