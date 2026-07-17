import cron from "node-cron";
import { config } from "../config.js";

/**
 * Self-ping the /health endpoint every 14 minutes to keep the backend
 * alive on free-tier hosting (e.g. Render, Railway) that spins down
 * after periods of inactivity.
 */
export function registerHealthPingCron() {
  const baseUrl = config.BACKEND_URL || `http://localhost:${config.PORT}`;

  cron.schedule("*/14 * * * *", async () => {
    try {
      const res = await fetch(`${baseUrl}/health`);
      const data = (await res.json()) as { ok: boolean };
      console.log(
        `health-ping: status=${res.status} ok=${data.ok} at ${new Date().toISOString()}`
      );
    } catch (e) {
      console.error("health-ping failed:", e);
    }
  });
}
