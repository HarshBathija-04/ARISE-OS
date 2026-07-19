/**
 * Read-layer: assembles view models for the clients.
 * Ported from Website/src/lib/player-data.ts (Prisma → supabase-js).
 *
 * Return shapes keep the original camelCase keys so the website's view-model
 * contracts don't change. Date fields are returned as ISO strings (Prisma
 * returned Date objects; JSON-serialised output is identical).
 */
import { db } from "../db/supabase.js";
import { gameDay, addDays } from "../engine/date.js";
import { xpForLevel } from "../engine/xp-engine.js";
import { rankForLevel } from "../engine/ranks.js";
import { computePerformance, type DailyMetric } from "../engine/performance-engine.js";
import { AppError } from "../middleware/error.js";

// ─────────────────── snake_case → camelCase mapping ───────────────────

function camelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Recursively camelCase object keys. Embedded relations (aliased in selects,
 * e.g. `completion:quest_completions(*)`) are converted too, matching the
 * shapes Prisma's `include` produced.
 */
function toCamel<T = any>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => toCamel(v)) as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[camelKey(k)] = toCamel(v);
    }
    return out as T;
  }
  return value as T;
}

/** supabase-js may return a to-one embed as a 1-element array; unwrap defensively. */
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

// ─────────────────── Profile ───────────────────

export async function getProfileView(userId: string) {
  const { data, error } = await db
    .from("player_profiles")
    .select("*, equipped_title:titles(*)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new AppError("Profile not found", 404);

  const profile = toCamel<Record<string, any>>({ ...data, equipped_title: one(data.equipped_title) });
  const rank = rankForLevel(profile.level);
  const xpForNext = xpForLevel(profile.level);
  return {
    ...profile,
    // Infinity at MAX_LEVEL is not JSON-safe → null.
    xpForNext: Number.isFinite(xpForNext) ? xpForNext : null,
    rankTier: rank,
  };
}

export async function getAttributes(userId: string) {
  const { data, error } = await db
    .from("attributes")
    .select("*")
    .eq("user_id", userId)
    .order("key", { ascending: true });
  if (error) throw new Error(error.message);
  return toCamel<Record<string, any>[]>(data);
}

// ─────────────────── Quests ───────────────────

export async function getTodayQuests(userId: string) {
  const today = gameDay();
  const { data, error } = await db
    .from("quests")
    .select("*, completion:quest_completions(*)")
    .eq("user_id", userId)
    .eq("assigned_date", today.toISOString())
    .order("status", { ascending: true })
    .order("type", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as Record<string, any>[]).map((q) => toCamel({ ...q, completion: one(q.completion) }));
}

// ─────────────────── Bosses ───────────────────

export async function getActiveBossBattles(userId: string) {
  const { data, error } = await db
    .from("boss_battles")
    .select("*, boss:bosses(*), logs:boss_battle_logs(*)")
    .eq("user_id", userId)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false, referencedTable: "logs" })
    .limit(8, { referencedTable: "logs" });
  if (error) throw new Error(error.message);
  return (data as Record<string, any>[]).map((b) => toCamel({ ...b, boss: one(b.boss) }));
}

// ─────────────────── Streaks & shields ───────────────────

export async function getStreaks(userId: string) {
  const { data, error } = await db
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .order("current", { ascending: false });
  if (error) throw new Error(error.message);
  return toCamel<Record<string, any>[]>(data);
}

export async function getUnusedShields(userId: string): Promise<number> {
  const { count, error } = await db
    .from("streak_shields")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("used_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ─────────────────── Notifications ───────────────────

export async function getRecentNotifications(userId: string, take = 8) {
  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(take);
  if (error) throw new Error(error.message);
  return toCamel<Record<string, any>[]>(data);
}

// ─────────────────── Daily metrics / performance / heatmap ───────────────────

/** Aggregate ActivityLog + quests + habits into DailyMetric rows for N days. */
export async function getDailyMetrics(userId: string, days = 30): Promise<DailyMetric[]> {
  const start = addDays(gameDay(), -(days - 1)).toISOString();

  const [activitiesRes, questsRes, habitLogsRes] = await Promise.all([
    db.from("activity_logs").select("*").eq("user_id", userId).gte("date", start),
    db
      .from("quests")
      .select("*, completion:quest_completions(*)")
      .eq("user_id", userId)
      .eq("type", "DAILY")
      .gte("assigned_date", start),
    db
      .from("habit_logs")
      .select("*, habit:habits(*)")
      .eq("user_id", userId)
      .gte("date", start),
  ]);
  if (activitiesRes.error) throw new Error(activitiesRes.error.message);
  if (questsRes.error) throw new Error(questsRes.error.message);
  if (habitLogsRes.error) throw new Error(habitLogsRes.error.message);

  const activities = activitiesRes.data as Record<string, any>[];
  const quests = (questsRes.data as Record<string, any>[]).map(
    (q): Record<string, any> => ({ ...q, completion: one<Record<string, any>>(q.completion) }),
  );
  const habitLogs = (habitLogsRes.data as Record<string, any>[]).map(
    (h): Record<string, any> => ({ ...h, habit: one<Record<string, any>>(h.habit) }),
  );

  const map = new Map<string, DailyMetric>();
  const ensure = (k: string): DailyMetric => {
    let m = map.get(k);
    if (!m) {
      m = {
        dayKey: k, wokeOnTime: false, routineCompletionRatio: 0,
        studyMinutes: 0, dsaSolved: 0, gateMinutes: 0,
        workout: false, runKm: 0, steps: 0,
        deepWorkSessions: 0, focusMinutes: 0, distractionMinutes: 0,
        sleepHours: 7, cleanDay: true, urgesResistedRatio: 1,
      };
      map.set(k, m);
    }
    return m;
  };

  for (const a of activities) {
    const k = String(a.date).slice(0, 10);
    const m = ensure(k);
    switch (a.kind) {
      case "study_minutes": m.studyMinutes += a.value; break;
      case "gate_minutes": m.gateMinutes += a.value; break;
      case "dsa_solved": m.dsaSolved += a.value; break;
      case "focus_minutes": m.focusMinutes += a.value; break;
      case "workout": m.workout = true; break;
      case "run_km": m.runKm += a.value; break;
      case "steps": m.steps += a.value; break;
      case "reels_minutes": m.distractionMinutes += a.value; break;
      case "sleep_hours": m.sleepHours = a.value; break;
    }
  }

  // routine completion ratio per day
  const byDayQuest = new Map<string, { total: number; done: number; deep: number }>();
  for (const q of quests) {
    const k = String(q.assigned_date).slice(0, 10);
    const rec = byDayQuest.get(k) ?? { total: 0, done: 0, deep: 0 };
    rec.total += 1;
    if (q.completion && q.completion.result !== "FAILED") {
      rec.done += 1;
      if (q.category === "focus") rec.deep += 1;
    }
    byDayQuest.set(k, rec);
  }
  for (const [k, rec] of byDayQuest) {
    const m = ensure(k);
    m.routineCompletionRatio = rec.total ? rec.done / rec.total : 0;
    m.deepWorkSessions = Math.max(m.deepWorkSessions, rec.deep);
  }

  for (const h of habitLogs) {
    const k = String(h.date).slice(0, 10);
    const m = ensure(k);
    if (h.habit?.streak_key === "wake" && h.result === "DONE") m.wokeOnTime = true;
    if (h.habit?.kind === "SHADOW" && h.result === "RELAPSE") m.cleanDay = false;
  }

  return [...map.values()];
}

export async function getPerformance(userId: string) {
  const metrics = await getDailyMetrics(userId, 30);
  return computePerformance(metrics);
}

/** GitHub-style heatmap data: completion intensity per day for the last `days`. */
export async function getHeatmap(userId: string, days = 120) {
  const metrics = await getDailyMetrics(userId, days);
  const byKey = new Map(metrics.map((m) => [m.dayKey, m]));
  const cells: { date: string; intensity: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(gameDay(), -i);
    const k = d.toISOString().slice(0, 10);
    const m = byKey.get(k);
    const intensity = m ? Math.round(m.routineCompletionRatio * 4) : 0;
    cells.push({ date: k, intensity });
  }
  return cells;
}

// ─────────────────── Recovery / rewards / habits ───────────────────

export async function getOpenRecoveryQuest(userId: string) {
  const { data, error } = await db
    .from("recovery_quests")
    .select("*")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toCamel<Record<string, any>>(data) : null;
}

export async function getRewards(userId: string) {
  const { data, error } = await db
    .from("rewards")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("cost", { ascending: true });
  if (error) throw new Error(error.message);
  return toCamel<Record<string, any>[]>(data);
}

export async function getShadowHabitStatus(userId: string) {
  const [habitsRes, streaksRes] = await Promise.all([
    db.from("habits").select("*").eq("user_id", userId).eq("kind", "SHADOW"),
    db.from("streaks").select("*").eq("user_id", userId),
  ]);
  if (habitsRes.error) throw new Error(habitsRes.error.message);
  if (streaksRes.error) throw new Error(streaksRes.error.message);

  const streaks = toCamel<Record<string, any>[]>(streaksRes.data);
  const smap = new Map(streaks.map((s) => [s.key, s]));
  return (habitsRes.data as Record<string, any>[]).map((h) => ({
    key: h.key,
    title: h.title,
    streak: h.streak_key ? smap.get(h.streak_key) : undefined,
  }));
}

// ─────────────────── Composite dashboard ───────────────────

/** One round-trip payload for the home screen of both clients. */
export async function getDashboard(userId: string) {
  const [profile, quests, streaks, notifications, performance, openRecoveryQuest, unusedShields] =
    await Promise.all([
      getProfileView(userId),
      getTodayQuests(userId),
      getStreaks(userId),
      getRecentNotifications(userId, 10),
      getPerformance(userId),
      getOpenRecoveryQuest(userId),
      getUnusedShields(userId),
    ]);
  return { profile, quests, streaks, notifications, performance, openRecoveryQuest, unusedShields };
}
