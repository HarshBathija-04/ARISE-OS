"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/current-user";
import {
  setBlockState,
  addBlock,
  editBlock,
  deleteBlock,
  logStudy,
} from "@/lib/game-engine/timetable-service";

const timetableState = z.enum([
  "UPCOMING",
  "ACTIVE",
  "COMPLETED",
  "MISSED",
  "SKIPPED",
  "PAUSED",
  "LATE",
  "FINISHED_EARLY",
]);

const category = z.enum([
  "STUDY",
  "EXERCISE",
  "MORNING_ROUTINE",
  "BATH",
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "GAMING",
  "BREAK",
  "SLEEP",
]);

const blockInput = z.object({
  order: z.number().int().min(0).max(100),
  startHour: z.number().int().min(0).max(23),
  startMin: z.number().int().min(0).max(59),
  endHour: z.number().int().min(0).max(23),
  endMin: z.number().int().min(0).max(59),
  activity: z.string().min(1).max(80),
  category,
  xpReward: z.number().int().min(0).max(1000),
});

export async function setBlockStateAction(input: { blockId: string; state: string }) {
  const userId = await requireUserId();
  const { blockId, state } = z
    .object({ blockId: z.string().min(1), state: timetableState })
    .parse(input);
  const res = await setBlockState(userId, blockId, state);
  revalidatePath("/timetable");
  revalidatePath("/");
  return res;
}

export async function addBlockAction(input: z.infer<typeof blockInput>) {
  const userId = await requireUserId();
  const data = blockInput.parse(input);
  const block = await addBlock(userId, data);
  revalidatePath("/timetable");
  return block;
}

export async function editBlockAction(input: { blockId: string; updates: Partial<z.infer<typeof blockInput>> }) {
  const userId = await requireUserId();
  const { blockId, updates } = z
    .object({ blockId: z.string().min(1), updates: blockInput.partial() })
    .parse(input);
  const block = await editBlock(userId, blockId, updates);
  revalidatePath("/timetable");
  return block;
}

export async function deleteBlockAction(input: { blockId: string }) {
  const userId = await requireUserId();
  const { blockId } = z.object({ blockId: z.string().min(1) }).parse(input);
  await deleteBlock(userId, blockId);
  revalidatePath("/timetable");
  return { ok: true };
}

export async function logStudyAction(input: {
  blockId: string;
  subject: string;
  durationMinutes: number;
  deepWorkScore: number;
  distractions: number;
  notes?: string;
  missionLinked?: string;
}) {
  const userId = await requireUserId();
  const data = z
    .object({
      blockId: z.string().min(1),
      subject: z.string().min(1).max(40),
      durationMinutes: z.number().int().min(0).max(600),
      deepWorkScore: z.number().int().min(1).max(10),
      distractions: z.number().int().min(0).max(200),
      notes: z.string().max(1000).optional(),
      missionLinked: z.string().max(120).optional(),
    })
    .parse(input);
  const res = await logStudy(userId, data);
  revalidatePath("/timetable");
  revalidatePath("/");
  return res;
}
