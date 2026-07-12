/** Read-layer: assembles view models for the pages. Server-only. */
import { prisma } from "@/lib/prisma";
import { gameDay, dayKey, addDays } from "@/lib/date";
import { xpForLevel } from "@/lib/game-engine/xp-engine";
import { rankForLevel } from "@/lib/game-engine/ranks";
import { computePerformance, type DailyMetric } from "@/lib/game-engine/performance-engine";

export async function getProfileView(userId: string) {
  const profile = await prisma.playerProfile.findUniqueOrThrow({
    where: { userId },
    include: { equippedTitle: true },
  });
  const rank = rankForLevel(profile.level);
  return {
    ...profile,
    xpForNext: xpForLevel(profile.level),
    rankTier: rank,
  };
}

export async function getAttributes(userId: string) {
  return prisma.attribute.findMany({
    where: { userId },
    orderBy: { key: "asc" },
  });
}

export async function getTodayQuests(userId: string) {
  const today = gameDay();
  return prisma.quest.findMany({
    where: { userId, assignedDate: today },
    include: { completion: true },
    orderBy: [{ status: "asc" }, { type: "asc" }, { createdAt: "asc" }],
  });
}

export async function getActiveBossBattles(userId: string) {
  return prisma.bossBattle.findMany({
    where: { userId },
    include: { boss: true, logs: { orderBy: { createdAt: "desc" }, take: 8 } },
    orderBy: { status: "asc" },
  });
}

export async function getStreaks(userId: string) {
  return prisma.streak.findMany({ where: { userId }, orderBy: { current: "desc" } });
}

export async function getRecentNotifications(userId: string, take = 8) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getUnusedShields(userId: string) {
  return prisma.streakShield.count({ where: { userId, usedAt: null } });
}

/** Aggregate ActivityLog + quests + habits into DailyMetric rows for N days. */
export async function getDailyMetrics(userId: string, days = 30): Promise<DailyMetric[]> {
  const start = addDays(gameDay(), -(days - 1));

  const [activities, quests, habitLogs] = await Promise.all([
    prisma.activityLog.findMany({ where: { userId, date: { gte: start } } }),
    prisma.quest.findMany({
      where: { userId, assignedDate: { gte: start }, type: "DAILY" },
      include: { completion: true },
    }),
    prisma.habitLog.findMany({
      where: { userId, date: { gte: start } },
      include: { habit: true },
    }),
  ]);

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
    const k = a.date.toISOString().slice(0, 10);
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
    const k = q.assignedDate.toISOString().slice(0, 10);
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
    const k = h.date.toISOString().slice(0, 10);
    const m = ensure(k);
    if (h.habit.key === "wake-5am" && h.result === "DONE") m.wokeOnTime = true;
    if (h.habit.kind === "SHADOW" && h.result === "RELAPSE") m.cleanDay = false;
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

export async function getOpenRecoveryQuest(userId: string) {
  return prisma.recoveryQuest.findFirst({ where: { userId, completed: false }, orderBy: { createdAt: "desc" } });
}

export async function getRewards(userId: string) {
  return prisma.reward.findMany({ where: { userId, active: true }, orderBy: { cost: "asc" } });
}

export async function getShadowHabitStatus(userId: string) {
  const habits = await prisma.habit.findMany({
    where: { userId, kind: "SHADOW" },
  });
  const streaks = await prisma.streak.findMany({ where: { userId } });
  const smap = new Map(streaks.map((s) => [s.key, s]));
  return habits.map((h) => ({
    key: h.key,
    title: h.title,
    streak: h.streakKey ? smap.get(h.streakKey) : undefined,
  }));
}
