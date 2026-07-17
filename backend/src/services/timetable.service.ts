/**
 * Timetable service — the single source of truth for timetable reads/writes.
 * Ported from Website/src/lib/game-engine/timetable-service.ts (Prisma → supabase-js).
 *
 * XP earned from completing schedule blocks / logging study flows through the
 * same `grantXp` + `logActivity` used by the rest of the game engine, so the
 * timetable contributes to the same progression and analytics.
 *
 * Return shapes are camelCase (identical to the Prisma originals); Date fields
 * are returned as ISO strings.
 */
import { db } from "../db/supabase.js";
import { gameDay } from "../engine/date.js";
import { grantXp, logActivity } from "./xp.service.js";
import { DEFAULT_TIMETABLE, TIMETABLE_XP, categoryDef } from "../engine/content/timetable.js";
import type {
  TimetableBlockRow,
  TimetableCategory,
  TimetableDayType,
  TimetableState,
} from "../db/tables.js";
import { AppError } from "../middleware/error.js";
import { supersedeBlockNotifications } from "./scheduler.service.js";
import { sendDataToUser } from "./push.service.js";

const COMPLETED_STATES: TimetableState[] = ["COMPLETED", "FINISHED_EARLY"];

/**
 * After any timetable mutation: bump the user's timetable_version (devices
 * compare it to decide whether to re-sync native alarms), supersede pending
 * server-side block reminders (re-materialized from the new blocks on the
 * next scheduler tick), and nudge devices with a silent FCM data message.
 */
export async function signalTimetableChanged(userId: string): Promise<number> {
  const { data, error } = await db
    .from("users")
    .select("timetable_version")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const version = ((data?.timetable_version as number) ?? 1) + 1;
  const { error: updErr } = await db
    .from("users")
    .update({ timetable_version: version })
    .eq("id", userId);
  if (updErr) throw new Error(updErr.message);

  try {
    await supersedeBlockNotifications(userId);
    await sendDataToUser(userId, { type: "resync", what: "timetable", version: String(version) });
  } catch (e) {
    // Resync signalling is best-effort — devices also re-sync on resume.
    console.error("timetable resync signal failed", e);
  }
  return version;
}

/** camelCase view of a timetable block (dates are ISO strings). */
export interface TimetableBlock {
  id: string;
  userId: string;
  order: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  activity: string;
  category: TimetableCategory;
  xpReward: number;
  dayType: TimetableDayType;
  createdAt: string;
  updatedAt: string;
}

function mapBlock(row: TimetableBlockRow): TimetableBlock {
  return {
    id: row.id,
    userId: row.user_id,
    order: row.order,
    startHour: row.start_hour,
    startMin: row.start_min,
    endHour: row.end_hour,
    endMin: row.end_min,
    activity: row.activity,
    category: row.category,
    xpReward: row.xp_reward,
    dayType: row.day_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listBlocks(userId: string, dayType?: TimetableDayType): Promise<TimetableBlock[]> {
  let query = db
    .from("timetable_blocks")
    .select("*")
    .eq("user_id", userId);
  // A concrete day type also shows the shared 'ALL' blocks (morning routine etc).
  if (dayType && dayType !== "ALL") query = query.in("day_type", ["ALL", dayType]);
  const { data, error } = await query.order("order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as TimetableBlockRow[]).map(mapBlock);
}

/** Return the user's blocks (optionally for one day-type variant), seeding the default schedule on first use. */
export async function getTimetable(
  userId: string,
  dayType?: TimetableDayType,
): Promise<TimetableBlock[]> {
  const existing = await listBlocks(userId);
  if (existing.length > 0) return dayType ? listBlocks(userId, dayType) : existing;

  const { error } = await db.from("timetable_blocks").insert(
    DEFAULT_TIMETABLE.map((b) => ({
      user_id: userId,
      order: b.order,
      start_hour: b.startHour,
      start_min: b.startMin,
      end_hour: b.endHour,
      end_min: b.endMin,
      activity: b.activity,
      category: b.category,
      xp_reward: b.xpReward,
    })),
  );
  if (error) throw new Error(error.message);
  return listBlocks(userId, dayType);
}

/** Maps of blockId -> state (and any excuse reasons) for the given game day (defaults to today). */
export async function getDayStates(
  userId: string,
  date: Date = gameDay(),
): Promise<{ states: Record<string, TimetableState>; excuses: Record<string, string> }> {
  const { data, error } = await db
    .from("timetable_block_logs")
    .select("block_id, state, exception_reason")
    .eq("user_id", userId)
    .eq("date", date.toISOString());
  if (error) throw new Error(error.message);
  const logs = data as { block_id: string; state: TimetableState; exception_reason: string }[];
  return {
    states: Object.fromEntries(logs.map((l) => [l.block_id, l.state])),
    excuses: Object.fromEntries(
      logs.filter((l) => l.exception_reason).map((l) => [l.block_id, l.exception_reason]),
    ),
  };
}

async function findBlock(userId: string, blockId: string): Promise<TimetableBlockRow> {
  const { data, error } = await db
    .from("timetable_blocks")
    .select("*")
    .eq("id", blockId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new AppError("Block not found", 404);
  return data as TimetableBlockRow;
}

/**
 * Set a block's runtime state for today. When a block transitions into a
 * completed state for the first time today, award its XP.
 *
 * `reason` is the user's explanation when raising an exception (state
 * EXCUSED) — a rare, valid-reason miss that is recorded but not penalised.
 */
export async function setBlockState(
  userId: string,
  blockId: string,
  state: TimetableState,
  reason?: string,
): Promise<{ xpAwarded: number }> {
  const block = await findBlock(userId, blockId);

  const date = gameDay().toISOString();
  const { data: prev, error: prevError } = await db
    .from("timetable_block_logs")
    .select("state")
    .eq("user_id", userId)
    .eq("block_id", blockId)
    .eq("date", date)
    .maybeSingle();
  if (prevError) throw new Error(prevError.message);

  const { error: upsertError } = await db
    .from("timetable_block_logs")
    .upsert(
      {
        user_id: userId,
        block_id: blockId,
        date,
        state,
        exception_reason: state === "EXCUSED" ? (reason ?? "") : "",
      },
      { onConflict: "user_id,block_id,date" },
    );
  if (upsertError) throw new Error(upsertError.message);

  const wasCompleted = prev ? COMPLETED_STATES.includes(prev.state as TimetableState) : false;
  const nowCompleted = COMPLETED_STATES.includes(state);
  if (nowCompleted && !wasCompleted && block.xp_reward > 0) {
    const def = categoryDef(block.category);
    const award = await grantXp({
      userId,
      rawXp: block.xp_reward,
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
  /** Optional: defaults to 0 (add) / array position (replace). */
  order?: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  activity: string;
  category: TimetableCategory;
  /** Optional: defaults to the category's standard XP. */
  xpReward?: number;
  /** Optional: which day-type variant this block belongs to (default 'ALL'). */
  dayType?: TimetableDayType;
}

function blockPayload(userId: string, input: BlockInput, fallbackOrder = 0) {
  return {
    user_id: userId,
    order: input.order ?? fallbackOrder,
    start_hour: input.startHour,
    start_min: input.startMin,
    end_hour: input.endHour,
    end_min: input.endMin,
    activity: input.activity,
    category: input.category,
    xp_reward: input.xpReward ?? TIMETABLE_XP[input.category],
    day_type: input.dayType ?? "ALL",
  };
}

export async function addBlock(userId: string, input: BlockInput): Promise<TimetableBlock> {
  const { data, error } = await db
    .from("timetable_blocks")
    .insert(blockPayload(userId, input))
    .select()
    .single();
  if (error) throw new Error(error.message);
  await signalTimetableChanged(userId);
  return mapBlock(data as TimetableBlockRow);
}

export async function editBlock(
  userId: string,
  blockId: string,
  updates: Partial<BlockInput>,
): Promise<TimetableBlock> {
  await findBlock(userId, blockId);

  const patch: Record<string, unknown> = {};
  if (updates.order !== undefined) patch.order = updates.order;
  if (updates.startHour !== undefined) patch.start_hour = updates.startHour;
  if (updates.startMin !== undefined) patch.start_min = updates.startMin;
  if (updates.endHour !== undefined) patch.end_hour = updates.endHour;
  if (updates.endMin !== undefined) patch.end_min = updates.endMin;
  if (updates.activity !== undefined) patch.activity = updates.activity;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.xpReward !== undefined) patch.xp_reward = updates.xpReward;
  if (updates.dayType !== undefined) patch.day_type = updates.dayType;

  const { data, error } = await db
    .from("timetable_blocks")
    .update(patch)
    .eq("id", blockId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await signalTimetableChanged(userId);
  return mapBlock(data as TimetableBlockRow);
}

export async function deleteBlock(userId: string, blockId: string): Promise<void> {
  await findBlock(userId, blockId);
  const { error } = await db.from("timetable_blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);
  await signalTimetableChanged(userId);
}

/**
 * Replace the schedule — the whole thing, or just one day-type variant when
 * `dayType` is given (other variants are left untouched).
 * Prisma transaction → sequential delete-then-insert (single-user app).
 */
export async function replaceTimetable(
  userId: string,
  blocks: BlockInput[],
  dayType?: TimetableDayType,
): Promise<TimetableBlock[]> {
  let del = db.from("timetable_blocks").delete().eq("user_id", userId);
  if (dayType) del = del.eq("day_type", dayType);
  const { error: delError } = await del;
  if (delError) throw new Error(delError.message);

  if (blocks.length > 0) {
    const { error: insError } = await db
      .from("timetable_blocks")
      .insert(blocks.map((b, i) => blockPayload(userId, { dayType, ...b }, i)));
    if (insError) throw new Error(insError.message);
  }
  await signalTimetableChanged(userId);
  return listBlocks(userId, dayType);
}

export interface StudyInput {
  blockId: string;
  subject: string;
  durationMinutes: number;
  deepWorkScore?: number;
  distractions?: number;
  notes?: string;
  missionLinked?: string;
}

/** Record a study session, award XP proportional to focus + duration. */
export async function logStudy(userId: string, input: StudyInput): Promise<{ xpAwarded: number }> {
  const { blockId, subject, durationMinutes } = input;
  const deepWorkScore = input.deepWorkScore ?? 5;
  const distractions = input.distractions ?? 0;
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

  const { error } = await db.from("study_logs").insert({
    user_id: userId,
    block_id: blockId,
    subject,
    duration_minutes: durationMinutes,
    deep_work_score: deepWorkScore,
    distractions,
    notes: input.notes ?? "",
    mission_linked: input.missionLinked ?? "",
    xp_earned: award.xpAwarded,
  });
  if (error) throw new Error(error.message);
  await logActivity(userId, "study_minutes", durationMinutes, { subject });

  return { xpAwarded: award.xpAwarded };
}

/** camelCase view of a study log (dates are ISO strings). */
export interface StudyLog {
  id: string;
  userId: string;
  blockId: string;
  subject: string;
  durationMinutes: number;
  deepWorkScore: number;
  distractions: number;
  notes: string;
  missionLinked: string;
  xpEarned: number;
  createdAt: string;
}

export async function getStudyLogs(userId: string, limit = 50): Promise<StudyLog[]> {
  const { data, error } = await db
    .from("study_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as Record<string, any>[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    blockId: row.block_id,
    subject: row.subject,
    durationMinutes: row.duration_minutes,
    deepWorkScore: row.deep_work_score,
    distractions: row.distractions,
    notes: row.notes,
    missionLinked: row.mission_linked,
    xpEarned: row.xp_earned,
    createdAt: row.created_at,
  }));
}
