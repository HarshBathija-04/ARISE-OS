/**
 * Streak Validation Engine — a streak must NEVER break on timetable data
 * alone. Before any break, evidence is gathered in priority order:
 *
 *   1. Completed timetable task        → continue.
 *   2. Time Log during the same period → continue (productive log).
 *   3. Related quest completed         → continue.
 *   4. AI verification over history    → continue on high confidence.
 *   5. No evidence anywhere            → break (only now).
 *
 * The daily reset consults `validateDayEvidence` before resetting the
 * profile streak, so a day rescued by Time Logs / quests survives.
 */
import { db } from "../db/supabase.js";
import { addDays, gameDay } from "../engine/date.js";
import type { TimeLogRow, TimetableBlockRow, TimetableState } from "../db/tables.js";
import { logDurationMinutes, overlapMinutes } from "./time-log.service.js";

const COMPLETED_STATES: TimetableState[] = ["COMPLETED", "FINISHED_EARLY"];

export interface StreakEvidence {
  /** Which check satisfied the streak, or null → break. */
  source: "TIMETABLE" | "TIME_LOG" | "QUEST" | "AI" | null;
  detail: string;
}

/** Step 1 — any completed timetable block on `day`. */
async function checkTimetable(userId: string, dayIso: string): Promise<StreakEvidence | null> {
  const { data, error } = await db
    .from("timetable_block_logs")
    .select("block_id, state")
    .eq("user_id", userId)
    .eq("date", dayIso)
    .in("state", COMPLETED_STATES)
    .limit(1);
  if (error) throw new Error(error.message);
  if (data && data.length > 0) {
    return { source: "TIMETABLE", detail: "Completed timetable block found" };
  }
  return null;
}

/** Step 2 — any productive Time Log on `day`. */
async function checkTimeLogs(userId: string, dayIso: string): Promise<StreakEvidence | null> {
  const { data, error } = await db
    .from("time_logs")
    .select("id, activity, analysis:time_log_ai_analysis(is_productive)")
    .eq("user_id", userId)
    .eq("date", dayIso);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as { id: string; activity: string; analysis: { is_productive: boolean }[] | { is_productive: boolean } | null }[]) {
    const analysis = Array.isArray(row.analysis) ? row.analysis[0] : row.analysis;
    if (analysis?.is_productive) {
      return { source: "TIME_LOG", detail: `Productive Time Log: ${row.activity}` };
    }
  }
  return null;
}

/** Step 3 — any quest completed on `day`. */
async function checkQuests(userId: string, dayIso: string, nextDayIso: string): Promise<StreakEvidence | null> {
  const { data, error } = await db
    .from("quest_completions")
    .select("id, result")
    .eq("user_id", userId)
    .gte("completed_at", dayIso)
    .lt("completed_at", nextDayIso)
    .in("result", ["COMPLETED", "PARTIAL"])
    .limit(1);
  if (error) throw new Error(error.message);
  if (data && data.length > 0) {
    return { source: "QUEST", detail: "Quest completed manually" };
  }
  return null;
}

/**
 * Step 4 — "AI verification": scan every other evidence stream the system
 * records (focus sessions, habit logs, activity logs, alarm confirmations).
 * Deterministic and data-driven — no model call needed for high confidence;
 * any concrete recorded effort counts.
 */
async function checkAiEvidence(userId: string, dayIso: string, nextDayIso: string): Promise<StreakEvidence | null> {
  // Focus sessions started that day.
  const { data: focus, error: fErr } = await db
    .from("focus_sessions")
    .select("id, actual_min")
    .eq("user_id", userId)
    .gte("started_at", dayIso)
    .lt("started_at", nextDayIso)
    .limit(5);
  if (fErr) throw new Error(fErr.message);
  if ((focus ?? []).some((s) => ((s.actual_min as number) ?? 0) >= 10)) {
    return { source: "AI", detail: "Focus session ≥10 min recorded" };
  }

  // Positive habit logs.
  const { data: habits, error: hErr } = await db
    .from("habit_logs")
    .select("id, result")
    .eq("user_id", userId)
    .eq("date", dayIso)
    .in("result", ["DONE", "CLEAN"])
    .limit(1);
  if (hErr) throw new Error(hErr.message);
  if (habits && habits.length > 0) {
    return { source: "AI", detail: "Positive habit log recorded" };
  }

  // Any meaningful activity log (study minutes, coding minutes, workouts...).
  const { data: acts, error: aErr } = await db
    .from("activity_logs")
    .select("id, kind, value")
    .eq("user_id", userId)
    .eq("date", dayIso)
    .limit(20);
  if (aErr) throw new Error(aErr.message);
  const meaningful = (acts ?? []).filter(
    (a) => !["reels_minutes", "gaming_minutes", "entertainment_minutes"].includes(a.kind as string) && ((a.value as number) ?? 0) > 0,
  );
  if (meaningful.length > 0) {
    return { source: "AI", detail: `Activity evidence: ${meaningful[0]!.kind}` };
  }

  // Confirmed alarms (user responded to a block alarm = engaged with the day).
  const { data: alarms, error: alErr } = await db
    .from("alarm_events")
    .select("id")
    .eq("user_id", userId)
    .eq("date", dayIso)
    .eq("event", "CONFIRMED")
    .limit(1);
  if (alErr) throw new Error(alErr.message);
  if (alarms && alarms.length > 0) {
    return { source: "AI", detail: "Alarm confirmation recorded" };
  }
  return null;
}

/**
 * Full 5-step validation for a game day. Returns the first evidence found in
 * priority order, or `{source: null}` → only then may a streak break.
 */
export async function validateDayEvidence(userId: string, day: Date = gameDay()): Promise<StreakEvidence> {
  const dayIso = day.toISOString();
  const nextDayIso = addDays(day, 1).toISOString();

  return (
    (await checkTimetable(userId, dayIso)) ??
    (await checkTimeLogs(userId, dayIso)) ??
    (await checkQuests(userId, dayIso, nextDayIso)) ??
    (await checkAiEvidence(userId, dayIso, nextDayIso)) ?? { source: null, detail: "No qualifying activity found through any source" }
  );
}

/**
 * Block-level validation: given a scheduled block that was NOT completed,
 * check whether a Time Log covers ≥50% of its period (the "reality override").
 */
export async function timeLogCoversBlock(
  userId: string,
  block: TimetableBlockRow,
  day: Date = gameDay(),
): Promise<TimeLogRow | null> {
  const { data, error } = await db
    .from("time_logs")
    .select("*, analysis:time_log_ai_analysis(is_productive)")
    .eq("user_id", userId)
    .eq("date", day.toISOString());
  if (error) throw new Error(error.message);

  const blockShape = {
    startHour: block.start_hour,
    startMin: block.start_min,
    endHour: block.end_hour,
    endMin: block.end_min,
  };
  const blockLen = Math.max(1, logDurationMinutes(blockShape));
  for (const row of (data ?? []) as (TimeLogRow & { analysis: { is_productive: boolean }[] | { is_productive: boolean } | null })[]) {
    const analysis = Array.isArray(row.analysis) ? row.analysis[0] : row.analysis;
    if (!analysis?.is_productive) continue;
    const ov = overlapMinutes(blockShape, {
      startHour: row.start_hour,
      startMin: row.start_min,
      endHour: row.end_hour,
      endMin: row.end_min,
    });
    if (ov >= blockLen * 0.5) return row;
  }
  return null;
}
