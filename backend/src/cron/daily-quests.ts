import cron from "node-cron";
import { db } from "../db/supabase.js";
import { ensureQuestsForDay, ensureTodayQuests } from "../services/quest.service.js";
import { addDays, gameDay } from "../engine/date.js";

/**
 * Two schedules (both idempotent; a missed tick only delays generation until
 * the next app open, because GET /v1/quests/today lazily ensures the set):
 *
 *   12:00 IST (06:30 UTC) — pre-generate TOMORROW's quests for every user.
 *     They're written with tomorrow's assigned_date, so they stay invisible
 *     until the game day flips at midnight.
 *   00:00 IST (18:30 UTC) — safety pass ensuring the new day's quests exist
 *     (no-op when the noon pre-generation already ran).
 */
async function forEachUser(
  label: string,
  fn: (userId: string) => Promise<{ created: number }>,
): Promise<{ users: number; created: number }> {
  const { data: users, error } = await db.from("users").select("id");
  if (error) throw new Error(error.message);
  let created = 0;
  for (const u of users ?? []) {
    try {
      created += (await fn(u.id)).created;
    } catch (e) {
      console.error(`${label} failed for user ${u.id}`, e);
    }
  }
  return { users: users?.length ?? 0, created };
}

/** Ensure TODAY's quests for every user (midnight safety pass / manual trigger). */
export async function runDailyQuestGeneration() {
  return forEachUser("daily-quests", (id) => ensureTodayQuests(id));
}

/** Pre-generate TOMORROW's quests for every user (noon run / manual trigger). */
export async function runNextDayQuestGeneration() {
  const tomorrow = addDays(gameDay(), 1);
  return forEachUser("next-day-quests", (id) => ensureQuestsForDay(id, tomorrow));
}

export function registerDailyQuestCron() {
  cron.schedule("30 6 * * *", async () => {
    try {
      const res = await runNextDayQuestGeneration();
      console.log(`next-day-quests cron: ${res.created} quests across ${res.users} users`);
    } catch (e) {
      console.error("next-day-quests cron failed", e);
    }
  });
  cron.schedule("30 18 * * *", async () => {
    try {
      const res = await runDailyQuestGeneration();
      console.log(`daily-quests cron: ${res.created} quests across ${res.users} users`);
    } catch (e) {
      console.error("daily-quests cron failed", e);
    }
  });
}
