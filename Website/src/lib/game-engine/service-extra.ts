/**
 * Additional server-side game operations: habits, urges/recovery, focus start,
 * reward economy, and idempotent daily-quest generation.
 */
import type { FocusCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gameDay, dayKey } from "@/lib/date";
import { advanceStreak, bumpMetric, notify, logActivity } from "./service";
import { generateDailyQuests } from "./quest-engine";

// ─────────────────── Habits ───────────────────

/**
 * Log a habit for today. BUILD habits: DONE advances the streak, MISSED breaks it.
 * SHADOW habits: CLEAN advances the clean streak, RELAPSE breaks it and spawns a
 * recovery quest (never any level loss).
 */
export async function logHabit(params: {
  userId: string;
  habitKey: string;
  result: "DONE" | "MISSED" | "CLEAN" | "RELAPSE";
  note?: string;
}) {
  const { userId, habitKey, result, note = "" } = params;
  const habit = await prisma.habit.findUnique({
    where: { userId_key: { userId, key: habitKey } },
  });
  if (!habit) throw new Error("Habit not found");

  const date = gameDay();
  await prisma.habitLog.upsert({
    where: { habitId_date: { habitId: habit.id, date } },
    update: { result, note },
    create: { userId, habitId: habit.id, date, result, note },
  });

  if (habit.streakKey) {
    const success = result === "DONE" || result === "CLEAN";
    await advanceStreak(userId, habit.streakKey, success);
  }

  if (result === "CLEAN") {
    await logActivity(userId, "clean_day", 1, { habit: habitKey });
  }

  if (result === "RELAPSE") {
    await createRecoveryQuest(userId, `relapse:${habitKey}`);
    await notify(userId, "RECOVERY_ACTIVATED", "RECOVERY QUEST ACTIVATED",
      "No progress erased. A short recovery sequence is ready to help you regain control.");
  }

  return { ok: true };
}

// ─────────────────── Urges & recovery ───────────────────

export async function logUrge(params: {
  userId: string;
  habitKey: string;
  resisted: boolean;
  trigger?: string;
  mood?: string;
  location?: string;
  reason?: string;
}) {
  const { userId, habitKey, resisted, trigger = "", mood = "", location = "", reason = "" } = params;
  await prisma.urgeLog.create({
    data: { userId, habitKey, resisted, trigger, mood, location, reason },
  });
  if (resisted) {
    await bumpMetric(userId, "urges_resisted", 1);
    // Small discipline/focus reward for resisting — logged as activity, not raw XP farming.
    await notify(userId, "SYSTEM", "URGE RESISTED", "You chose control. That choice compounds.");
  } else {
    await createRecoveryQuest(userId, `urge:${habitKey}`);
  }
  return { ok: true };
}

export const RECOVERY_STEPS = [
  "Leave the current environment for 5 minutes.",
  "Drink a full glass of water.",
  "Walk for 10 minutes.",
  "Write down the trigger you noticed.",
  "Block or remove the triggering source.",
  "Complete a 15-minute productive task.",
];

export async function createRecoveryQuest(userId: string, reason: string) {
  const open = await prisma.recoveryQuest.findFirst({
    where: { userId, completed: false },
  });
  if (open) return open; // one active recovery quest at a time
  return prisma.recoveryQuest.create({
    data: { userId, reason, steps: RECOVERY_STEPS },
  });
}

export async function completeRecoveryQuest(userId: string, id: string) {
  const rq = await prisma.recoveryQuest.findFirst({ where: { id, userId, completed: false } });
  if (!rq) throw new Error("Recovery quest not found");
  await prisma.recoveryQuest.update({
    where: { id },
    data: { completed: true, completedAt: new Date() },
  });
  await bumpMetric(userId, "recovery_completed", 1);
  await notify(userId, "SYSTEM", "CONTROL RECLAIMED", "Recovery complete. You turned a slip into a rep of discipline.");
  return { ok: true };
}

// ─────────────────── Focus start ───────────────────

export async function startFocusSession(params: {
  userId: string;
  category: FocusCategory;
  plannedMinutes: number;
  questId?: string;
}) {
  const { userId, category, plannedMinutes, questId } = params;
  return prisma.focusSession.create({
    data: { userId, category, plannedMin: plannedMinutes, questId: questId ?? null },
  });
}

// ─────────────────── Reward economy ───────────────────

export async function purchaseReward(userId: string, rewardId: string) {
  return prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findFirst({ where: { id: rewardId, userId, active: true } });
    if (!reward) throw new Error("Reward not found");
    const profile = await tx.playerProfile.findUniqueOrThrow({ where: { userId } });
    if (profile.coins < reward.cost) {
      throw new Error("Not enough coins");
    }
    const balance = profile.coins - reward.cost;
    await tx.playerProfile.update({ where: { userId }, data: { coins: balance } });
    await tx.coinTransaction.create({
      data: { userId, amount: -reward.cost, reason: "PURCHASE", source: reward.title, balance },
    });
    await tx.rewardPurchase.create({ data: { userId, rewardId, cost: reward.cost } });
    return { ok: true, balance };
  });
}

export async function createReward(params: {
  userId: string;
  title: string;
  description: string;
  cost: number;
  icon?: string;
}) {
  const { userId, title, description, cost, icon = "gift" } = params;
  return prisma.reward.create({
    data: { userId, title, description, cost: Math.max(1, Math.round(cost)), icon, custom: true },
  });
}

// ─────────────────── Daily quest generation ───────────────────

/**
 * Idempotently ensure today's quests exist. Uses recent completion history and
 * streak/distraction state to adapt the plan. Safe to call on dashboard load.
 */
export async function ensureTodayQuests(userId: string) {
  const today = gameDay();
  const existing = await prisma.quest.count({ where: { userId, assignedDate: today } });
  if (existing > 0) return { created: 0 };

  // Build engine context from recent data.
  const recent = await recentCompletionRatios(userId, 7);
  const failingStreaks = await failingStreakKeys(userId);
  const distractionYesterday = await distractionMinutes(userId, -1);
  const inRecovery = (await prisma.recoveryQuest.count({ where: { userId, completed: false } })) > 0;
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const weakest = await weakestAttributeKey(userId);

  const planned = generateDailyQuests({
    dayKey: dayKey(),
    userId,
    recentCompletion: recent,
    failingStreaks,
    distractionMinutesYesterday: distractionYesterday,
    inRecovery,
    difficultyBias: settings?.difficultyBias ?? 1,
    weakestAttribute: weakest,
  });

  const templates = await prisma.questTemplate.findMany();
  const tmap = new Map(templates.map((t) => [t.key, t]));

  for (const q of planned) {
    const tmpl = tmap.get(q.key);
    await prisma.quest.create({
      data: {
        userId,
        templateId: tmpl?.id ?? null,
        title: q.title,
        description: q.description,
        type: q.type,
        difficulty: q.difficulty,
        category: q.category,
        estMinutes: q.estMinutes,
        baseXp: q.baseXp,
        attributeXp: q.attributeXp,
        coinReward: q.coinReward ?? 0,
        streakKey: q.streakKey ?? null,
        failureNote: q.failureNote ?? "",
        assignedDate: today,
      },
    });
  }
  await notify(userId, "QUEST_GENERATED", "DAILY QUESTS GENERATED",
    `${planned.length} quests await. Complete them to advance.`);
  return { created: planned.length };
}

async function recentCompletionRatios(userId: string, days: number): Promise<number[]> {
  const start = gameDay();
  start.setUTCDate(start.getUTCDate() - days);
  const quests = await prisma.quest.findMany({
    where: { userId, assignedDate: { gte: start }, type: "DAILY" },
    include: { completion: true },
  });
  const byDay = new Map<string, { total: number; done: number }>();
  for (const q of quests) {
    const k = q.assignedDate.toISOString().slice(0, 10);
    const rec = byDay.get(k) ?? { total: 0, done: 0 };
    rec.total += 1;
    if (q.completion && q.completion.result !== "FAILED") rec.done += 1;
    byDay.set(k, rec);
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, r]) => (r.total ? r.done / r.total : 0));
}

async function failingStreakKeys(userId: string): Promise<string[]> {
  const streaks = await prisma.streak.findMany({ where: { userId } });
  const today = gameDay();
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const priority = ["wake", "workout", "dsa", "gate"];
  return streaks
    .filter((s) => priority.includes(s.key))
    .filter((s) => {
      if (!s.lastDate) return true; // never done → worth prompting
      const last = gameDay(s.lastDate);
      return last.getTime() < yesterday.getTime();
    })
    .map((s) => s.key);
}

async function distractionMinutes(userId: string, dayOffset: number): Promise<number> {
  const day = gameDay();
  day.setUTCDate(day.getUTCDate() + dayOffset);
  const next = new Date(day);
  next.setUTCDate(next.getUTCDate() + 1);
  const agg = await prisma.activityLog.aggregate({
    _sum: { value: true },
    where: { userId, kind: "reels_minutes", date: { gte: day, lt: next } },
  });
  return agg._sum.value ?? 0;
}

async function weakestAttributeKey(userId: string): Promise<string | undefined> {
  const attrs = await prisma.attribute.findMany({ where: { userId } });
  if (attrs.length === 0) return undefined;
  return attrs.reduce((min, a) => (a.totalXp < min.totalXp ? a : min), attrs[0]!).key;
}
