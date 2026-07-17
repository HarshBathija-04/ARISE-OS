/**
 * Daily reset — the per-user rollover run at each user's configured
 * reset_time (default 00:00 local), dispatched by the scheduler.
 *
 *   1. Expire yesterday's still-ACTIVE quests (archive — no FAILED completion
 *      rows, no per-key streak penalty, no shield burn).
 *   2. Profile streak rule: completed ≥1 quest yesterday → streak survives
 *      (it was already incremented by touchActiveDay); 0 completions → reset
 *      current_streak to 0 (longest_streak preserved).
 *   3. Write yesterday's DAILY report rollup (XP, quests done/total).
 *   4. Ensure today's quests exist (idempotent; usually pre-generated).
 *   5. Push "🎯 New Daily Quests Available" (deduped per day).
 */
import { db } from "../db/supabase.js";
import { addDays, dayKey, gameDay } from "../engine/date.js";
import { ensureQuestsForDay } from "./quest.service.js";
import { notifyAndPush } from "./notification.service.js";
import { TEMPLATES } from "../engine/content/notification-templates.js";

export async function runDailyResetForUser(
  userId: string,
  opts: { scheduledId?: string; dayKeyStr?: string } = {},
): Promise<{ expired: number; streakReset: boolean; created: number }> {
  const today = opts.dayKeyStr
    ? new Date(`${opts.dayKeyStr}T00:00:00.000Z`)
    : gameDay();
  const yesterday = addDays(today, -1);

  // 1. Archive: expire yesterday's untouched quests.
  const { data: expiredRows, error: expErr } = await db
    .from("quests")
    .update({ status: "EXPIRED" })
    .eq("user_id", userId)
    .eq("assigned_date", yesterday.toISOString())
    .eq("status", "ACTIVE")
    .select("id");
  if (expErr) throw new Error(expErr.message);
  const expired = expiredRows?.length ?? 0;

  // 2. Yesterday's completions decide the profile streak.
  const { data: completions, error: compErr } = await db
    .from("quest_completions")
    .select("xp_awarded, result, completed_at")
    .eq("user_id", userId)
    .gte("completed_at", yesterday.toISOString())
    .lt("completed_at", today.toISOString());
  if (compErr) throw new Error(compErr.message);
  const done = (completions ?? []).filter((c) => c.result === "COMPLETED" || c.result === "PARTIAL");
  const xpYesterday = (completions ?? []).reduce((s, c) => s + ((c.xp_awarded as number) ?? 0), 0);

  let streakReset = false;
  if (done.length === 0) {
    const { data: prof, error: profErr } = await db
      .from("player_profiles")
      .select("id, current_streak")
      .eq("user_id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (prof && (prof.current_streak as number) > 0) {
      const { error } = await db
        .from("player_profiles")
        .update({ current_streak: 0 })
        .eq("id", prof.id);
      if (error) throw new Error(error.message);
      streakReset = true;
    }
  }

  // 3. Daily report rollup (unique on user/type/period_key → idempotent).
  const yKey = dayKey(yesterday);
  const { count: totalYesterday, error: totErr } = await db
    .from("quests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("assigned_date", yesterday.toISOString());
  if (totErr) throw new Error(totErr.message);
  const { error: repErr } = await db.from("reports").insert({
    user_id: userId,
    type: "DAILY",
    period_key: yKey,
    data: {
      xpEarned: xpYesterday,
      questsCompleted: done.length,
      questsTotal: totalYesterday ?? 0,
      questsExpired: expired,
      streakReset,
    },
    summary: `${done.length}/${totalYesterday ?? 0} quests, ${xpYesterday} XP${streakReset ? ", streak reset" : ""}`,
  });
  if (repErr && repErr.code !== "23505") throw new Error(repErr.message);

  // 4. New day's quests (no-op when pre-generated at noon).
  const { created } = await ensureQuestsForDay(userId, today);

  // 5. Reset push.
  const tpl = TEMPLATES.DAILY_RESET;
  const todayKey = dayKey(today);
  await notifyAndPush(userId, "DAILY_RESET", tpl.title, tpl.body, { day: todayKey }, {
    dedupeKey: `DAILY_RESET:${todayKey}`,
    deeplink: tpl.deeplink,
    actions: tpl.actions,
    scheduledId: opts.scheduledId,
    tag: "daily-reset",
  });

  return { expired, streakReset, created };
}

/** Run the reset for every user (internal cron fallback). */
export async function runDailyResetForAll(): Promise<{ users: number; expired: number }> {
  const { data: users, error } = await db.from("users").select("id");
  if (error) throw new Error(error.message);
  let expired = 0;
  for (const u of users ?? []) {
    try {
      expired += (await runDailyResetForUser(u.id)).expired;
    } catch (e) {
      console.error(`daily-reset failed for user ${u.id}`, e);
    }
  }
  return { users: users?.length ?? 0, expired };
}
