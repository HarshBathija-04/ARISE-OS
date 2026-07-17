import cron from "node-cron";
import { schedulerTick } from "../services/scheduler.service.js";

/**
 * Minutely scheduled-notification tick (materialize + dispatch). Idempotent —
 * a missed tick is caught up on the next one because dispatch selects every
 * PENDING row with fire_at in the past. External fallback:
 * POST /v1/internal/cron/scheduler-tick.
 */
export function registerSchedulerCron() {
  cron.schedule("* * * * *", async () => {
    try {
      const res = await schedulerTick();
      if (res.dispatched > 0 || res.failed > 0) {
        console.log(`scheduler tick: ${res.dispatched} dispatched, ${res.failed} failed`);
      }
    } catch (e) {
      console.error("scheduler tick failed", e);
    }
  });
}
