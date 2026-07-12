"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import {
  completeQuest,
  completeFocusSession,
  logMainQuestProgress,
} from "@/lib/game-engine/service";
import {
  logHabit,
  logUrge,
  startFocusSession,
  completeRecoveryQuest,
  purchaseReward,
  createReward,
  ensureTodayQuests,
} from "@/lib/game-engine/service-extra";
import { logActivity } from "@/lib/game-engine/service";
import type { FocusCategory } from "@prisma/client";

const questResult = z.enum(["COMPLETED", "PARTIAL", "FAILED"]);

export async function completeQuestAction(input: { questId: string; result: string }) {
  const userId = await requireUserId();
  const schema = z.object({ questId: z.string().min(1), result: questResult });
  const { questId, result } = schema.parse(input);
  const award = await completeQuest(userId, questId, result);
  revalidatePath("/");
  revalidatePath("/quests");
  return award;
}

export async function logMainQuestProgressAction(input: { stageId: string; amount: number }) {
  const userId = await requireUserId();
  const schema = z.object({
    stageId: z.string().min(1),
    amount: z.number().int().min(1).max(50),
  });
  const { stageId, amount } = schema.parse(input);
  const res = await logMainQuestProgress(userId, stageId, amount);
  revalidatePath("/main-quests");
  revalidatePath("/");
  return res;
}

export async function generateTodayQuestsAction() {
  const userId = await requireUserId();
  const res = await ensureTodayQuests(userId);
  revalidatePath("/");
  revalidatePath("/quests");
  return res;
}

const focusCategory = z.enum([
  "GATE", "DSA", "AIML", "FULLSTACK", "DATASCIENCE", "SYSTEMDESIGN", "PROJECT",
]);

export async function startFocusAction(input: {
  category: string;
  plannedMinutes: number;
  questId?: string;
}) {
  const userId = await requireUserId();
  const schema = z.object({
    category: focusCategory,
    plannedMinutes: z.number().int().min(5).max(240),
    questId: z.string().optional(),
  });
  const { category, plannedMinutes, questId } = schema.parse(input);
  const session = await startFocusSession({
    userId,
    category: category as FocusCategory,
    plannedMinutes,
    questId,
  });
  return { sessionId: session.id };
}

export async function completeFocusAction(input: {
  sessionId: string;
  actualMinutes: number;
  result: string;
}) {
  const userId = await requireUserId();
  const schema = z.object({
    sessionId: z.string().min(1),
    actualMinutes: z.number().int().min(0).max(480),
    result: z.enum(["COMPLETE", "PARTIAL", "ABANDONED"]),
  });
  const { sessionId, actualMinutes, result } = schema.parse(input);
  const award = await completeFocusSession({ userId, sessionId, actualMinutes, result });
  revalidatePath("/");
  revalidatePath("/focus");
  return award;
}

export async function logHabitAction(input: {
  habitKey: string;
  result: string;
  note?: string;
}) {
  const userId = await requireUserId();
  const schema = z.object({
    habitKey: z.string().min(1),
    result: z.enum(["DONE", "MISSED", "CLEAN", "RELAPSE"]),
    note: z.string().max(500).optional(),
  });
  const parsed = schema.parse(input);
  await logHabit({ userId, ...parsed });
  revalidatePath("/");
  revalidatePath("/shadow");
  revalidatePath("/streaks");
  return { ok: true };
}

export async function logUrgeAction(input: {
  habitKey: string;
  resisted: boolean;
  trigger?: string;
  mood?: string;
  location?: string;
  reason?: string;
}) {
  const userId = await requireUserId();
  const schema = z.object({
    habitKey: z.string().min(1),
    resisted: z.boolean(),
    trigger: z.string().max(200).optional(),
    mood: z.string().max(100).optional(),
    location: z.string().max(100).optional(),
    reason: z.string().max(300).optional(),
  });
  const parsed = schema.parse(input);
  await logUrge({ userId, ...parsed });
  revalidatePath("/recovery");
  revalidatePath("/shadow");
  return { ok: true };
}

export async function completeRecoveryAction(input: { id: string }) {
  const userId = await requireUserId();
  const { id } = z.object({ id: z.string().min(1) }).parse(input);
  await completeRecoveryQuest(userId, id);
  revalidatePath("/recovery");
  revalidatePath("/");
  return { ok: true };
}

export async function purchaseRewardAction(input: { rewardId: string }) {
  const userId = await requireUserId();
  const { rewardId } = z.object({ rewardId: z.string().min(1) }).parse(input);
  const res = await purchaseReward(userId, rewardId);
  revalidatePath("/rewards");
  revalidatePath("/");
  return res;
}

export async function createRewardAction(input: {
  title: string;
  description: string;
  cost: number;
  icon?: string;
}) {
  const userId = await requireUserId();
  const schema = z.object({
    title: z.string().min(1).max(80),
    description: z.string().max(200),
    cost: z.number().int().min(1).max(100000),
    icon: z.string().max(40).optional(),
  });
  const parsed = schema.parse(input);
  await createReward({ userId, ...parsed });
  revalidatePath("/rewards");
  return { ok: true };
}

export async function equipTitleAction(input: { titleId: string }) {
  const userId = await requireUserId();
  const { titleId } = z.object({ titleId: z.string().min(1) }).parse(input);
  // Verify the player owns the title before equipping.
  const owned = await prisma.userTitle.findUnique({
    where: { userId_titleId: { userId, titleId } },
  });
  if (!owned) throw new Error("Title not owned");
  await prisma.playerProfile.update({ where: { userId }, data: { equippedTitleId: titleId } });
  revalidatePath("/titles");
  revalidatePath("/");
  return { ok: true };
}

export async function updateSettingsAction(input: {
  wakeTarget?: string;
  sleepTarget?: string;
  minSleepHours?: number;
  difficultyBias?: number;
  reduceMotion?: boolean;
  aiProvider?: string;
  aiModel?: string;
}) {
  const userId = await requireUserId();
  const schema = z.object({
    wakeTarget: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    sleepTarget: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    minSleepHours: z.number().min(3).max(12).optional(),
    difficultyBias: z.number().min(0.5).max(2).optional(),
    reduceMotion: z.boolean().optional(),
    aiProvider: z.enum(["none", "anthropic", "openai", "gemini"]).optional(),
    aiModel: z.string().max(60).optional(),
  });
  const data = schema.parse(input);
  await prisma.userSettings.update({ where: { userId }, data });
  revalidatePath("/settings");
  return { ok: true };
}

/** Manual metric logging (steps, sleep, reels minutes, run) with sane caps. */
export async function logMetricAction(input: { kind: string; value: number }) {
  const userId = await requireUserId();
  const schema = z.object({
    kind: z.enum(["steps", "sleep_hours", "reels_minutes", "run_km", "gaming_minutes"]),
    value: z.number().min(0).max(100000),
  });
  const { kind, value } = schema.parse(input);
  await logActivity(userId, kind, value);
  revalidatePath("/analytics");
  revalidatePath("/");
  return { ok: true };
}
