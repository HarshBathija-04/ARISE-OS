/**
 * Server-side game service. All state mutations that grant XP/coins/levels
 * flow through here so the numbers are computed on the server and never trusted
 * from the client. Callable from server actions.
 */
import type { AttributeKey, QuestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gameDay, dayKey } from "@/lib/date";
import {
  applyXp,
  applyAttributeXp,
  applyDailySoftCap,
  calculateQuestXP,
  calculateFocusXP,
  calculateAttributeXP,
  coinsForXp,
  qualityRatio,
  xpForLevel,
} from "./xp-engine";
import { rankForLevel } from "./ranks";

type AttrMap = Partial<Record<AttributeKey, number>>;

/** Sum of XP already granted to the player during the current game day. */
async function xpEarnedToday(userId: string): Promise<number> {
  const today = gameDay();
  const [quests, focus] = await Promise.all([
    prisma.questCompletion.aggregate({
      _sum: { xpAwarded: true },
      where: { userId, completedAt: { gte: today } },
    }),
    prisma.focusSession.aggregate({
      _sum: { xpAwarded: true },
      where: { userId, startedAt: { gte: today } },
    }),
  ]);
  return (quests._sum.xpAwarded ?? 0) + (focus._sum.xpAwarded ?? 0);
}

async function equippedTitleBonus(userId: string): Promise<number> {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: { equippedTitle: true },
  });
  return profile?.equippedTitle?.xpBonusPct ?? 0;
}

export interface XpAwardResult {
  xpAwarded: number;
  coinsAwarded: number;
  leveledUp: boolean;
  newLevel: number;
  newRank: string;
  attributeLevelUps: AttributeKey[];
}

/**
 * Core XP grant: applies the daily soft cap, cascades level-ups, updates
 * attributes, coins, and writes level/notification records.
 */
export async function grantXp(params: {
  userId: string;
  rawXp: number;
  attributeXp: AttrMap;
  coinReason: "QUEST" | "FOCUS" | "ACHIEVEMENT" | "BOSS" | "STREAK";
  source: string;
  extraCoins?: number;
}): Promise<XpAwardResult> {
  const { userId, rawXp, attributeXp, coinReason, source, extraCoins = 0 } = params;

  const earnedToday = await xpEarnedToday(userId);
  const xpAwarded = applyDailySoftCap(earnedToday, Math.max(0, Math.round(rawXp)));

  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId } });

  const before = { level: profile.level, currentXp: profile.currentXp, xpForNext: xpForLevel(profile.level), totalXp: profile.totalXp };
  const after = applyXp(before, xpAwarded);
  const leveledUp = after.level > before.level;
  const newRank = rankForLevel(after.level);

  const coinsAwarded = coinsForXp(xpAwarded) + extraCoins;
  const newCoinBalance = profile.coins + coinsAwarded;

  await prisma.playerProfile.update({
    where: { userId },
    data: {
      level: after.level,
      currentXp: after.currentXp,
      totalXp: after.totalXp,
      rank: newRank.name,
      coins: newCoinBalance,
    },
  });

  if (coinsAwarded > 0) {
    await prisma.coinTransaction.create({
      data: { userId, amount: coinsAwarded, reason: coinReason, source, balance: newCoinBalance },
    });
  }

  // Attribute XP
  const attributeLevelUps: AttributeKey[] = [];
  for (const [key, gain] of Object.entries(attributeXp)) {
    if (!gain || gain <= 0) continue;
    const attr = await prisma.attribute.findUnique({
      where: { userId_key: { userId, key: key as AttributeKey } },
    });
    if (!attr) continue;
    const res = applyAttributeXp({ level: attr.level, xp: attr.xp, totalXp: attr.totalXp }, gain);
    await prisma.attribute.update({
      where: { id: attr.id },
      data: { level: res.level, xp: res.xp, totalXp: res.totalXp },
    });
    await prisma.attributeHistory.create({
      data: {
        userId, attributeId: attr.id, key: key as AttributeKey,
        xpDelta: gain, totalXpAt: res.totalXp, levelAt: res.level, source,
      },
    });
    if (res.leveledUp) attributeLevelUps.push(key as AttributeKey);
  }

  // Level-up records + notifications
  if (leveledUp) {
    await prisma.levelProgress.create({
      data: { userId, fromLevel: before.level, toLevel: after.level, rank: newRank.name, totalXpAt: after.totalXp },
    });
    await notify(userId, "LEVEL_UP", "LEVEL INCREASED", `You have reached Level ${after.level} — ${newRank.name}.`);
    await bumpMetric(userId, "level", after.level, "set");
  }
  for (const key of attributeLevelUps) {
    await notify(userId, "ATTRIBUTE_UP", "ATTRIBUTE IMPROVED", `${key} increased.`);
  }

  return {
    xpAwarded,
    coinsAwarded,
    leveledUp,
    newLevel: after.level,
    newRank: newRank.name,
    attributeLevelUps,
  };
}

export async function notify(
  userId: string,
  type: Parameters<typeof prisma.notification.create>[0]["data"]["type"],
  title: string,
  body = "",
  meta?: Record<string, unknown>,
) {
  await prisma.notification.create({
    data: { userId, type, title, body, meta: meta as never },
  });
}

export interface MainQuestProgressResult {
  progress: number;
  target: number;
  completed: boolean;
  award: XpAwardResult | null;
}

/**
 * Advance a Main Quest stage by `amount` progress units. Clearing a stage
 * (progress reaching targetUnits) grants a milestone XP + coin reward and
 * notifies the player. Idempotent-safe: already-completed stages are no-ops.
 */
export async function logMainQuestProgress(
  userId: string,
  stageId: string,
  amount: number,
): Promise<MainQuestProgressResult> {
  const stage = await prisma.mainQuestStage.findFirst({
    where: { id: stageId, mainQuest: { userId } },
    include: { mainQuest: true },
  });
  if (!stage) throw new Error("Stage not found");

  const step = Math.max(1, Math.min(50, Math.round(amount)));
  if (stage.completed) {
    return { progress: stage.progress, target: stage.targetUnits, completed: true, award: null };
  }

  const newProgress = Math.min(stage.targetUnits, stage.progress + step);
  const justCompleted = newProgress >= stage.targetUnits;

  await prisma.mainQuestStage.update({
    where: { id: stage.id },
    data: {
      progress: newProgress,
      completed: justCompleted,
      completedAt: justCompleted ? new Date() : null,
    },
  });

  let award: XpAwardResult | null = null;
  if (justCompleted) {
    // Milestone reward scales with the stage's size.
    const rawXp = 200 + stage.targetUnits;
    award = await grantXp({
      userId,
      rawXp,
      attributeXp: {},
      coinReason: "QUEST",
      source: `mainquest:${stage.mainQuest.key}:${stage.key}`,
      extraCoins: Math.round(stage.targetUnits / 5),
    });
    await notify(
      userId,
      "QUEST_COMPLETED",
      "STAGE CLEARED",
      `${stage.mainQuest.title} — "${stage.title}" complete. +${award.xpAwarded} XP.`,
    );
  }

  return { progress: newProgress, target: stage.targetUnits, completed: justCompleted, award };
}

/**
 * Increment (or set) an achievement metric, unlocking any achievements whose
 * threshold is crossed and granting their rewards (recursively via grantXp for
 * the reward XP, but WITHOUT re-triggering achievement loops on that XP).
 */
export async function bumpMetric(
  userId: string,
  metric: string,
  amount: number,
  mode: "inc" | "set" = "inc",
) {
  const rows = await prisma.userAchievement.findMany({
    where: { userId, unlocked: false, achievement: { metric } },
    include: { achievement: true },
  });
  for (const row of rows) {
    const next = mode === "set" ? amount : row.progress + amount;
    const unlocked = next >= row.achievement.targetValue;
    await prisma.userAchievement.update({
      where: { id: row.id },
      data: {
        progress: next,
        unlocked,
        unlockedAt: unlocked ? new Date() : null,
      },
    });
    if (unlocked) {
      await unlockAchievementRewards(userId, row.achievementId);
    }
  }
}

async function unlockAchievementRewards(userId: string, achievementId: string) {
  const a = await prisma.achievement.findUniqueOrThrow({ where: { id: achievementId } });

  // Grant XP/coins directly (no soft-cap gaming loop for achievement bonuses).
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
  const before = { level: profile.level, currentXp: profile.currentXp, xpForNext: xpForLevel(profile.level), totalXp: profile.totalXp };
  const after = applyXp(before, a.xpReward);
  const rank = rankForLevel(after.level);
  const coins = profile.coins + a.coinReward;
  await prisma.playerProfile.update({
    where: { userId },
    data: { level: after.level, currentXp: after.currentXp, totalXp: after.totalXp, rank: rank.name, coins },
  });
  if (a.coinReward > 0) {
    await prisma.coinTransaction.create({
      data: { userId, amount: a.coinReward, reason: "ACHIEVEMENT", source: a.key, balance: coins },
    });
  }

  await notify(userId, "ACHIEVEMENT_UNLOCKED",
    a.hidden ? "HIDDEN ACHIEVEMENT UNLOCKED" : "ACHIEVEMENT UNLOCKED",
    `${a.title} — ${a.description}`);

  // Grant linked title, if any.
  if (a.titleKey) {
    const title = await prisma.title.findUnique({ where: { key: a.titleKey } });
    if (title) {
      const existing = await prisma.userTitle.findUnique({
        where: { userId_titleId: { userId, titleId: title.id } },
      });
      if (!existing) {
        await prisma.userTitle.create({ data: { userId, titleId: title.id } });
        await notify(userId, "TITLE_ACQUIRED", "NEW TITLE ACQUIRED", `You earned the title “${title.name}”.`);
      }
    }
  }
}

// ─────────────────── Quest completion ───────────────────

export async function completeQuest(userId: string, questId: string, result: QuestStatus) {
  const quest = await prisma.quest.findFirst({
    where: { id: questId, userId },
    include: { completion: true, template: true },
  });
  if (!quest) throw new Error("Quest not found");
  if (quest.completion) throw new Error("Quest already resolved");

  const ratio = qualityRatio(result);

  // Streak state (for bonus + updates)
  let streakDays = 0;
  if (quest.streakKey && result !== "FAILED") {
    const streak = await prisma.streak.findUnique({
      where: { userId_key: { userId, key: quest.streakKey } },
    });
    streakDays = streak?.current ?? 0;
  }

  // Anti-farm: how many equivalent template completions already today.
  const repeatIndexToday = quest.templateId
    ? await prisma.quest.count({
        where: {
          userId,
          templateId: quest.templateId,
          assignedDate: quest.assignedDate,
          completion: { isNot: null },
        },
      })
    : 0;

  const titleBonus = await equippedTitleBonus(userId);

  const rawXp = calculateQuestXP({
    baseXp: quest.baseXp,
    difficulty: quest.difficulty,
    result,
    streakDays,
    repeatIndexToday,
    titleBonusPct: titleBonus,
  });

  const attributeXp = result === "FAILED"
    ? {}
    : calculateAttributeXP(quest.attributeXp as AttrMap, ratio * (1 + Math.min(0.4, streakDays * 0.04)));

  const award: XpAwardResult = rawXp > 0
    ? await grantXp({
        userId, rawXp, attributeXp,
        coinReason: "QUEST", source: `quest:${quest.template?.key ?? quest.id}`,
        extraCoins: result === "COMPLETED" ? quest.coinReward : Math.round(quest.coinReward * ratio),
      })
    : { xpAwarded: 0, coinsAwarded: 0, leveledUp: false, newLevel: 0, newRank: "", attributeLevelUps: [] };

  await prisma.$transaction([
    prisma.quest.update({
      where: { id: quest.id },
      data: { status: result },
    }),
    prisma.questCompletion.create({
      data: {
        userId, questId: quest.id, result,
        xpAwarded: award.xpAwarded, coinsAwarded: award.coinsAwarded,
        attributeXp: attributeXp as never, qualityRatio: ratio,
      },
    }),
  ]);

  // Streak updates
  if (quest.streakKey) {
    await advanceStreak(userId, quest.streakKey, result !== "FAILED");
  }

  // Metrics for achievements (derived from the quest's streak/category).
  if (result !== "FAILED") {
    await bumpMetric(userId, "quest_completed", 1);
    const key = quest.template?.key ?? "";
    if (quest.streakKey === "dsa") {
      await bumpMetric(userId, "dsa_solved", 3);
      await logActivity(userId, "dsa_solved", 3);
    }
    if (key === "dsa-1-hard") {
      await bumpMetric(userId, "dsa_solved", 1);
      await logActivity(userId, "dsa_solved", 1);
    }
    if (quest.streakKey === "workout") {
      await bumpMetric(userId, "workout_count", 1);
      await logActivity(userId, "workout", 1);
    }
    if (quest.streakKey === "cardio") {
      await bumpMetric(userId, "run_km_total", 2);
      await logActivity(userId, "run_km", 2);
    }
    if (quest.category === "study" && quest.estMinutes >= 30) {
      await bumpMetric(userId, "study_minutes", quest.estMinutes);
      await logActivity(userId, "study_minutes", quest.estMinutes);
      if (key.startsWith("gate")) await bumpMetric(userId, "gate_minutes", quest.estMinutes);
    }
  }

  await notify(userId, "QUEST_COMPLETED", "QUEST COMPLETED", `${quest.title} (+${award.xpAwarded} XP).`);

  // Boss damage from certain quest categories.
  await maybeDamageActiveBosses(userId, quest.category, result);

  await touchActiveDay(userId);

  return award;
}

// ─────────────────── Streaks ───────────────────

export async function advanceStreak(userId: string, key: string, success: boolean) {
  const streak = await prisma.streak.findUnique({ where: { userId_key: { userId, key } } });
  if (!streak) return;
  const today = gameDay();

  if (success) {
    const current = streak.current + 1;
    const longest = Math.max(streak.longest, current);
    await prisma.streak.update({
      where: { id: streak.id },
      data: { current, longest, lastDate: today },
    });
    // Award a Streak Shield every 7 perfect days (max 3 unused shields).
    if (current > 0 && current % 7 === 0) {
      const unused = await prisma.streakShield.count({ where: { userId, usedAt: null } });
      if (unused < 3) {
        await prisma.streakShield.create({ data: { userId } });
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
    // Failure: try to spend a shield; otherwise reset.
    const shield = await prisma.streakShield.findFirst({ where: { userId, usedAt: null } });
    if (shield) {
      await prisma.streakShield.update({
        where: { id: shield.id },
        data: { usedAt: new Date(), usedOnKey: key },
      });
      await notify(userId, "SYSTEM", "STREAK PROTECTED", `A shield absorbed the miss on your ${streak.title}.`);
    } else if (streak.current > 0) {
      await prisma.streak.update({ where: { id: streak.id }, data: { current: 0 } });
      await notify(userId, "STREAK_AT_RISK", "STREAK RESET", `${streak.title} reset. No level lost — rebuild from here.`);
    }
  }
}

// ─────────────────── Focus sessions ───────────────────

export async function completeFocusSession(params: {
  userId: string;
  sessionId: string;
  actualMinutes: number;
  result: "COMPLETE" | "PARTIAL" | "ABANDONED";
}) {
  const { userId, sessionId, actualMinutes, result } = params;
  const session = await prisma.focusSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Session not found");
  if (session.endedAt) throw new Error("Session already ended");

  const titleBonus = await equippedTitleBonus(userId);
  const rawXp = calculateFocusXP({
    actualMinutes,
    plannedMinutes: session.plannedMin,
    result,
    titleBonusPct: titleBonus,
  });

  // Focus contributes to FOC/INT/DIS proportionally to minutes.
  const attributeXp: AttrMap = rawXp > 0
    ? { FOC: Math.round(actualMinutes * 0.4), INT: Math.round(actualMinutes * 0.25), DIS: Math.round(actualMinutes * 0.15) }
    : {};

  const award: XpAwardResult = rawXp > 0
    ? await grantXp({ userId, rawXp, attributeXp, coinReason: "FOCUS", source: `focus:${session.category}` })
    : { xpAwarded: 0, coinsAwarded: 0, leveledUp: false, newLevel: 0, newRank: "", attributeLevelUps: [] };

  await prisma.focusSession.update({
    where: { id: sessionId },
    data: { actualMin: actualMinutes, endedAt: new Date(), result, xpAwarded: award.xpAwarded },
  });

  // Activity + metrics
  await logActivity(userId, "study_minutes", actualMinutes, { category: session.category });
  await logActivity(userId, "focus_minutes", actualMinutes);
  if (result === "COMPLETE" || result === "PARTIAL") {
    await bumpMetric(userId, "focus_sessions", 1);
    await bumpMetric(userId, "focus_minutes", actualMinutes);
    await bumpMetric(userId, "study_minutes", actualMinutes);
    if (session.category === "GATE") await bumpMetric(userId, "gate_minutes", actualMinutes);
  }
  await maybeDamageActiveBosses(userId, "focus", "COMPLETED");
  await touchActiveDay(userId);

  return award;
}

// ─────────────────── Boss battles ───────────────────

const BOSS_DAMAGE: Record<string, number> = {
  focus: 10, study: 12, fitness: 15, discipline: 8, recovery: 6,
};

async function maybeDamageActiveBosses(userId: string, category: string, result: QuestStatus) {
  if (result === "FAILED") return;
  const base = BOSS_DAMAGE[category];
  if (!base) return;

  const battles = await prisma.bossBattle.findMany({
    where: { userId, status: "ACTIVE" },
    include: { boss: true },
  });
  for (const battle of battles) {
    // Deterministic "critical": every 5th log lands a 2x hit.
    const priorLogs = await prisma.bossBattleLog.count({ where: { battleId: battle.id } });
    const critical = (priorLogs + 1) % 5 === 0;
    const damage = critical ? base * 2 : base;
    const hpAfter = Math.max(0, battle.currentHp - damage);

    await prisma.bossBattleLog.create({
      data: { battleId: battle.id, action: category, damage, critical, hpAfter },
    });

    const defeated = hpAfter <= 0;
    // Advance phase based on remaining HP thresholds.
    const phases = (battle.boss.phases as Array<{ threshold: number }>) ?? [];
    const frac = hpAfter / battle.maxHp;
    let phase = 0;
    phases.forEach((p, i) => { if (frac <= p.threshold) phase = i; });

    await prisma.bossBattle.update({
      where: { id: battle.id },
      data: {
        currentHp: hpAfter,
        phase,
        status: defeated ? "DEFEATED" : "ACTIVE",
        endedAt: defeated ? new Date() : null,
      },
    });

    if (defeated) {
      await grantXp({
        userId, rawXp: battle.boss.rewardXp, attributeXp: {},
        coinReason: "BOSS", source: `boss:${battle.boss.key}`, extraCoins: battle.boss.rewardCoins,
      });
      if (battle.boss.rewardTitle) {
        const title = await prisma.title.findUnique({ where: { key: battle.boss.rewardTitle } });
        if (title) {
          const has = await prisma.userTitle.findUnique({ where: { userId_titleId: { userId, titleId: title.id } } });
          if (!has) await prisma.userTitle.create({ data: { userId, titleId: title.id } });
        }
      }
      await bumpMetric(userId, "boss_defeated", 1);
      await notify(userId, "BOSS_DEFEATED", "BOSS DEFEATED", `${battle.boss.name} has fallen. +${battle.boss.rewardXp} XP.`);
    }
  }
}

// ─────────────────── Activity + day tracking ───────────────────

export async function logActivity(
  userId: string,
  kind: string,
  value: number,
  meta?: Record<string, unknown>,
) {
  await prisma.activityLog.create({
    data: { userId, date: gameDay(), kind, value, meta: meta as never },
  });
}

async function touchActiveDay(userId: string) {
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
  const today = gameDay();
  const last = profile.lastActiveDate ? gameDay(profile.lastActiveDate) : null;
  if (last && last.getTime() === today.getTime()) return; // already counted today

  const activeDays = profile.activeDays + 1;
  await prisma.playerProfile.update({
    where: { userId },
    data: { activeDays, lastActiveDate: today },
  });
  await bumpMetric(userId, "active_days", activeDays, "set");
}
