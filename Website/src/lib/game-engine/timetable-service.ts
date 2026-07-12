/**
 * Timetable service — the single source of truth for timetable reads/writes,
 * shared by the web server actions and the mobile REST API.
 *
 * XP earned from completing schedule blocks / logging study flows through the
 * same `grantXp` + `logActivity` used by the rest of the game engine, so the
 * timetable contributes to the same progression and analytics.
 */
import type { TimetableBlock, TimetableState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";
import { grantXp, logActivity } from "@/lib/game-engine/service";
import { DEFAULT_TIMETABLE, categoryDef } from "@/lib/game-engine/content/timetable";

const COMPLETED_STATES: TimetableState[] = ["COMPLETED", "FINISHED_EARLY"];

/** Return the user's blocks, seeding the default schedule on first use. */
export async function getTimetable(userId: string): Promise<TimetableBlock[]> {
  const existing = await prisma.timetableBlock.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  });
  if (existing.length > 0) return existing;

  await prisma.timetableBlock.createMany({
    data: DEFAULT_TIMETABLE.map((b) => ({ ...b, userId })),
  });
  return prisma.timetableBlock.findMany({ where: { userId }, orderBy: { order: "asc" } });
}

/** Map of blockId -> state for the given game day (defaults to today). */
export async function getDayStates(
  userId: string,
  date: Date = gameDay(),
): Promise<Record<string, TimetableState>> {
  const logs = await prisma.timetableBlockLog.findMany({
    where: { userId, date },
  });
  return Object.fromEntries(logs.map((l) => [l.blockId, l.state]));
}

/**
 * Set a block's runtime state for today. When a block transitions into a
 * completed state for the first time today, award its XP.
 */
export async function setBlockState(
  userId: string,
  blockId: string,
  state: TimetableState,
): Promise<{ xpAwarded: number }> {
  const block = await prisma.timetableBlock.findFirst({ where: { id: blockId, userId } });
  if (!block) throw new Error("Block not found");

  const date = gameDay();
  const prev = await prisma.timetableBlockLog.findUnique({
    where: { userId_blockId_date: { userId, blockId, date } },
  });

  await prisma.timetableBlockLog.upsert({
    where: { userId_blockId_date: { userId, blockId, date } },
    update: { state },
    create: { userId, blockId, date, state },
  });

  const wasCompleted = prev ? COMPLETED_STATES.includes(prev.state) : false;
  const nowCompleted = COMPLETED_STATES.includes(state);
  if (nowCompleted && !wasCompleted && block.xpReward > 0) {
    const def = categoryDef(block.category);
    const award = await grantXp({
      userId,
      rawXp: block.xpReward,
      attributeXp: block.category === "STUDY" ? { INT: 10, FOC: 8, DIS: 6 } : { DIS: 4, CON: 4 },
      coinReason: "QUEST",
      source: `timetable:${def.code}`,
    });
    await logActivity(userId, "timetable_block", 1, { category: def.code, activity: block.activity });
    return { xpAwarded: award.xpAwarded };
  }
  return { xpAwarded: 0 };
}

export interface BlockInput {
  order: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  activity: string;
  category: TimetableBlock["category"];
  xpReward: number;
}

export async function addBlock(userId: string, input: BlockInput): Promise<TimetableBlock> {
  return prisma.timetableBlock.create({ data: { ...input, userId } });
}

export async function editBlock(
  userId: string,
  blockId: string,
  updates: Partial<BlockInput>,
): Promise<TimetableBlock> {
  const block = await prisma.timetableBlock.findFirst({ where: { id: blockId, userId } });
  if (!block) throw new Error("Block not found");
  return prisma.timetableBlock.update({ where: { id: blockId }, data: updates });
}

export async function deleteBlock(userId: string, blockId: string): Promise<void> {
  const block = await prisma.timetableBlock.findFirst({ where: { id: blockId, userId } });
  if (!block) throw new Error("Block not found");
  await prisma.timetableBlock.delete({ where: { id: blockId } });
}

/** Replace the whole schedule (used by the mobile PUT /api/timetable). */
export async function replaceTimetable(userId: string, blocks: BlockInput[]): Promise<TimetableBlock[]> {
  await prisma.$transaction([
    prisma.timetableBlock.deleteMany({ where: { userId } }),
    prisma.timetableBlock.createMany({ data: blocks.map((b) => ({ ...b, userId })) }),
  ]);
  return prisma.timetableBlock.findMany({ where: { userId }, orderBy: { order: "asc" } });
}

export interface StudyInput {
  blockId: string;
  subject: string;
  durationMinutes: number;
  deepWorkScore: number;
  distractions: number;
  notes?: string;
  missionLinked?: string;
}

/** Record a study session, award XP proportional to focus + duration. */
export async function logStudy(userId: string, input: StudyInput): Promise<{ xpAwarded: number }> {
  const { blockId, subject, durationMinutes, deepWorkScore, distractions } = input;
  // Base XP scales with minutes and deep-work quality, penalised by distractions.
  const quality = Math.max(0.2, deepWorkScore / 10 - distractions * 0.02);
  const rawXp = Math.round(durationMinutes * 1.5 * quality);

  const award = rawXp > 0
    ? await grantXp({
        userId,
        rawXp,
        attributeXp: { INT: Math.round(durationMinutes * 0.3), FOC: Math.round(durationMinutes * 0.2) },
        coinReason: "FOCUS",
        source: `study:${subject}`,
      })
    : { xpAwarded: 0 };

  await prisma.studyLog.create({
    data: {
      userId,
      blockId,
      subject,
      durationMinutes,
      deepWorkScore,
      distractions,
      notes: input.notes ?? "",
      missionLinked: input.missionLinked ?? "",
      xpEarned: award.xpAwarded,
    },
  });
  await logActivity(userId, "study_minutes", durationMinutes, { subject });

  return { xpAwarded: award.xpAwarded };
}

export async function getStudyLogs(userId: string, limit = 50) {
  return prisma.studyLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
