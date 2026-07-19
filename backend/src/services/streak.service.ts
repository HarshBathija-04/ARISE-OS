/**
 * Streak advancement/reset logic, including Streak Shields.
 *
 * Resets go through the Streak Validation Engine first: a streak is only
 * broken when no evidence of qualifying activity exists anywhere (timetable,
 * Time Logs, quests, focus/habit/activity records) — see
 * streak-validation.service.ts.
 */
import { db } from "../db/supabase.js";
import { gameDay } from "../engine/date.js";
import { notify, bumpMetric } from "./xp.service.js";
import { validateDayEvidence } from "./streak-validation.service.js";

// ─────────────────── Streaks ───────────────────

export async function advanceStreak(userId: string, key: string, success: boolean) {
  const { data: streak, error } = await db
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!streak) return;
  const today = gameDay();

  if (success) {
    const current = streak.current + 1;
    const longest = Math.max(streak.longest, current);
    const { error: upErr } = await db
      .from("streaks")
      .update({ current, longest, last_date: today.toISOString() })
      .eq("id", streak.id);
    if (upErr) throw new Error(upErr.message);
    // Award a Streak Shield every 7 perfect days (max 3 unused shields).
    if (current > 0 && current % 7 === 0) {
      const { count, error: cErr } = await db
        .from("streak_shields")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("used_at", null);
      if (cErr) throw new Error(cErr.message);
      const unused = count ?? 0;
      if (unused < 3) {
        const { error: iErr } = await db.from("streak_shields").insert({ user_id: userId });
        if (iErr) throw new Error(iErr.message);
        await notify(userId, "SYSTEM", "STREAK SHIELD EARNED", "A shield can protect one streak from a single missed day.");
      }
    }
    // Streak-based achievement metrics
    const metricMap: Record<string, string> = {
      wake: "wake_streak", "no-reels": "no_reels_streak", "porn-free": "porn_free_streak",
      deepwork: "deepwork_streak", cardio: "cardio_streak", sleep: "sleep_streak", routine: "routine_streak",
    };
    const metric = metricMap[key];
    if (metric) await bumpMetric(userId, metric, current, "set");
  } else {
    // Failure reported — but never break on a single signal. If ANY other
    // evidence source proves qualifying activity today (completed block,
    // productive Time Log, quest, focus/habit/activity record), the streak
    // survives without burning a shield.
    const evidence = await validateDayEvidence(userId, today);
    if (evidence.source !== null) {
      await notify(
        userId,
        "SYSTEM",
        "STREAK VALIDATED",
        `${streak.title} continues — ${evidence.detail}.`,
      );
      return;
    }
    // No evidence: try to spend a shield; otherwise reset.
    const { data: shields, error: sErr } = await db
      .from("streak_shields")
      .select("*")
      .eq("user_id", userId)
      .is("used_at", null)
      .limit(1);
    if (sErr) throw new Error(sErr.message);
    const shield = shields?.[0];
    if (shield) {
      const { error: upErr } = await db
        .from("streak_shields")
        .update({ used_at: new Date().toISOString(), used_on_key: key })
        .eq("id", shield.id);
      if (upErr) throw new Error(upErr.message);
      await notify(userId, "SYSTEM", "STREAK PROTECTED", `A shield absorbed the miss on your ${streak.title}.`);
    } else if (streak.current > 0) {
      const { error: upErr } = await db.from("streaks").update({ current: 0 }).eq("id", streak.id);
      if (upErr) throw new Error(upErr.message);
      await notify(userId, "STREAK_AT_RISK", "STREAK RESET", `${streak.title} reset. No level lost — rebuild from here.`);
    }
  }
}
