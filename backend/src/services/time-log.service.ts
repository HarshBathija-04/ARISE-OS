/**
 * Time Log service — the "reality" layer over the planned timetable.
 *
 * The timetable is the plan; time_logs record what the user ACTUALLY did.
 * XP, quests, skill progress, streak validation and analytics all treat a
 * Time Log as an override of the overlapping schedule block:
 *
 *   1. Block completed                 → planned XP (timetable.service).
 *   2. Block skipped + productive log  → XP from the logged activity.
 *   3. Block skipped + no log          → no XP.
 *   4. Break/free time used for work   → XP from the logged activity.
 *   5. Entertainment in free time      → recorded, no XP.
 *
 * XP for a log = minutes × 1.2 × aiMultiplier × (productivity / 100),
 * soft-capped by the shared grantXp path like every other XP source.
 */
import { db } from "../db/supabase.js";
import { gameDay } from "../engine/date.js";
import { AppError } from "../middleware/error.js";
import type {
  AttrMap,
  TimeLogAiAnalysisRow,
  TimeLogCategory,
  TimeLogRow,
  TimetableBlockRow,
  TimetableState,
} from "../db/tables.js";
import {
  classifyTimeLog,
  NON_PRODUCTIVE_CATEGORIES,
  type TimeLogClassification,
} from "./ai-classify.service.js";
import { grantXp, logActivity, bumpMetric } from "./xp.service.js";

const COMPLETED_STATES: TimetableState[] = ["COMPLETED", "FINISHED_EARLY"];

// ─────────────────── View shapes (camelCase) ───────────────────

export interface TimeLogView {
  id: string;
  userId: string;
  date: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  activity: string;
  category: TimeLogCategory;
  description: string;
  notes: string;
  mood: string;
  energyLevel: number | null;
  location: string;
  blockId: string | null;
  aiSummary: string;
  xpAwarded: number;
  skillXp: number;
  tags: string[];
  analysis: AnalysisView | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisView {
  provider: string;
  category: TimeLogCategory;
  difficulty: string;
  productivityScore: number;
  focusScore: number;
  suggestedSkill: string;
  xpMultiplier: number;
  isProductive: boolean;
  isDeepWork: boolean;
  contributesToQuest: boolean;
  suggestNewQuest: boolean;
  insights: string;
}

function mapAnalysis(row: TimeLogAiAnalysisRow | null | undefined): AnalysisView | null {
  if (!row) return null;
  return {
    provider: row.provider,
    category: row.category,
    difficulty: row.difficulty,
    productivityScore: row.productivity_score,
    focusScore: row.focus_score,
    suggestedSkill: row.suggested_skill,
    xpMultiplier: row.xp_multiplier,
    isProductive: row.is_productive,
    isDeepWork: row.is_deep_work,
    contributesToQuest: row.contributes_quest,
    suggestNewQuest: row.suggest_new_quest,
    insights: row.insights,
  };
}

type LogRowJoined = TimeLogRow & {
  tags?: { tag: string }[];
  analysis?: TimeLogAiAnalysisRow | TimeLogAiAnalysisRow[] | null;
};

function mapLog(row: LogRowJoined): TimeLogView {
  const analysis = Array.isArray(row.analysis) ? row.analysis[0] : row.analysis;
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    startHour: row.start_hour,
    startMin: row.start_min,
    endHour: row.end_hour,
    endMin: row.end_min,
    activity: row.activity,
    category: row.category,
    description: row.description,
    notes: row.notes,
    mood: row.mood,
    energyLevel: row.energy_level,
    location: row.location,
    blockId: row.block_id,
    aiSummary: row.ai_summary,
    xpAwarded: row.xp_awarded,
    skillXp: row.skill_xp,
    tags: (row.tags ?? []).map((t) => t.tag),
    analysis: mapAnalysis(analysis),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LOG_SELECT = "*, tags:time_log_tags(tag), analysis:time_log_ai_analysis(*)";

// ─────────────────── Helpers ───────────────────

export function minutesOf(h: number, m: number) {
  return h * 60 + m;
}

/** Duration in minutes; end past midnight wraps to next day. */
export function logDurationMinutes(l: { startHour: number; startMin: number; endHour: number; endMin: number }) {
  const start = minutesOf(l.startHour, l.startMin);
  let end = minutesOf(l.endHour, l.endMin);
  if (end <= start) end += 24 * 60;
  return end - start;
}

/** Overlap in minutes between a log and a timetable block (same-day wall clock). */
export function overlapMinutes(
  a: { startHour: number; startMin: number; endHour: number; endMin: number },
  b: { startHour: number; startMin: number; endHour: number; endMin: number },
) {
  const aStart = minutesOf(a.startHour, a.startMin);
  const aEnd = aStart + logDurationMinutes(a);
  const bStart = minutesOf(b.startHour, b.startMin);
  const bEnd = bStart + logDurationMinutes(b);
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/** The planned block (if any) that overlaps the log's period the most. */
async function findOverlappingBlock(
  userId: string,
  log: { startHour: number; startMin: number; endHour: number; endMin: number },
): Promise<TimetableBlockRow | null> {
  const { data, error } = await db.from("timetable_blocks").select("*").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const blocks = (data ?? []) as TimetableBlockRow[];
  let best: TimetableBlockRow | null = null;
  let bestOverlap = 0;
  for (const b of blocks) {
    const ov = overlapMinutes(log, {
      startHour: b.start_hour,
      startMin: b.start_min,
      endHour: b.end_hour,
      endMin: b.end_min,
    });
    if (ov > bestOverlap) {
      best = b;
      bestOverlap = ov;
    }
  }
  return best;
}

/** Attribute XP per category, scaled by duration. */
function attributeXpFor(category: TimeLogCategory, minutes: number): AttrMap {
  const unit = Math.max(1, Math.round(minutes / 10));
  switch (category) {
    case "STUDY":
      return { INT: unit * 3, FOC: unit * 2, DIS: unit };
    case "CODING":
    case "AIML":
      return { INT: unit * 2, SKL: unit * 2, FOC: unit * 2 };
    case "READING":
    case "WRITING":
      return { INT: unit * 2, FOC: unit };
    case "FITNESS":
      return { STR: unit * 3, END: unit * 2, CON: unit };
    case "HEALTH":
      return { VIT: unit * 2, CON: unit };
    case "FINANCE":
    case "BUSINESS":
      return { INT: unit, DIS: unit, SKL: unit };
    default:
      return { DIS: unit };
  }
}

/** Achievement/analytics activity kind per category. */
const ACTIVITY_KIND: Partial<Record<TimeLogCategory, string>> = {
  STUDY: "study_minutes",
  CODING: "coding_minutes",
  AIML: "coding_minutes",
  READING: "reading_minutes",
  WRITING: "writing_minutes",
  FITNESS: "exercise_minutes",
  ENTERTAINMENT: "entertainment_minutes",
};

// ─────────────────── Skill progress ───────────────────

/**
 * Contribute units to the suggested skill tree: the first non-mastered node
 * (lowest tier, AVAILABLE or IN_PROGRESS) receives `units` progress.
 */
async function contributeSkillProgress(
  userId: string,
  timeLogId: string,
  treeKey: string,
  units: number,
): Promise<number> {
  if (!treeKey || units <= 0) return 0;
  const { data: tree, error: tErr } = await db
    .from("skill_trees")
    .select("id, nodes:skill_nodes(id, tier, target_units, progress:skill_progress(id, user_id, status, units))")
    .eq("user_id", userId)
    .eq("key", treeKey)
    .maybeSingle();
  if (tErr) throw new Error(tErr.message);
  if (!tree) return 0;

  type ProgRow = { id: string; user_id: string; status: string; units: number };
  type NodeRow = {
    id: string;
    tier: number;
    target_units: number;
    // node_id is unique on skill_progress, so PostgREST returns an object, not an array.
    progress: ProgRow | ProgRow[] | null;
  };
  const asArray = (p: NodeRow["progress"]): ProgRow[] =>
    Array.isArray(p) ? p : p ? [p] : [];
  const nodes = ((tree.nodes ?? []) as NodeRow[])
    .map((n) => ({ ...n, prog: asArray(n.progress).find((p) => p.user_id === userId) }))
    .filter((n) => n.prog && (n.prog.status === "AVAILABLE" || n.prog.status === "IN_PROGRESS"))
    .sort((a, b) => a.tier - b.tier);
  const node = nodes[0];
  if (!node || !node.prog) return 0;

  const newUnits = node.prog.units + units;
  const mastered = newUnits >= node.target_units;
  const { error: upErr } = await db
    .from("skill_progress")
    .update({ units: newUnits, status: mastered ? "MASTERED" : "IN_PROGRESS" })
    .eq("id", node.prog.id);
  if (upErr) throw new Error(upErr.message);

  // Audit the contribution.
  const { error: insErr } = await db.from("time_log_skill_progress").insert({
    time_log_id: timeLogId,
    user_id: userId,
    tree_key: treeKey,
    node_id: node.id,
    units,
  });
  if (insErr) throw new Error(insErr.message);
  return units;
}

// ─────────────────── Persist analysis ───────────────────

async function saveAnalysis(
  userId: string,
  timeLogId: string,
  c: TimeLogClassification,
): Promise<void> {
  const { error } = await db.from("time_log_ai_analysis").upsert(
    {
      time_log_id: timeLogId,
      user_id: userId,
      provider: c.provider,
      category: c.category,
      difficulty: c.difficulty,
      productivity_score: c.productivityScore,
      focus_score: c.focusScore,
      suggested_skill: c.suggestedSkill,
      xp_multiplier: c.xpMultiplier,
      is_productive: c.isProductive,
      is_deep_work: c.isDeepWork,
      contributes_quest: c.contributesToQuest,
      suggest_new_quest: c.suggestNewQuest,
      insights: c.insights,
      raw: c.raw,
    },
    { onConflict: "time_log_id" },
  );
  if (error) throw new Error(error.message);
}

// ─────────────────── XP awarding ───────────────────

/** Estimated XP before capping — shown as a preview and used at award time. */
export function estimateLogXp(minutes: number, c: TimeLogClassification): number {
  if (!c.isProductive || c.xpMultiplier <= 0) return 0;
  return Math.round(minutes * 1.2 * c.xpMultiplier * (c.productivityScore / 100));
}

/**
 * Award XP + skill progress for a log (idempotent — a log that already earned
 * XP is skipped). Applies the XP rules from the module spec.
 */
async function awardForLog(
  userId: string,
  log: TimeLogRow,
  c: TimeLogClassification,
): Promise<{ xpAwarded: number; skillXp: number; reason: string }> {
  if (log.xp_awarded > 0) return { xpAwarded: log.xp_awarded, skillXp: log.skill_xp, reason: "already-awarded" };

  const minutes = logDurationMinutes({
    startHour: log.start_hour,
    startMin: log.start_min,
    endHour: log.end_hour,
    endMin: log.end_min,
  });

  // Always record the activity for analytics/reports — even when no XP.
  const kind = ACTIVITY_KIND[c.category];
  if (kind) await logActivity(userId, kind, minutes, { activity: log.activity, timeLogId: log.id });
  await logActivity(userId, "time_log", minutes, { category: c.category, activity: log.activity, timeLogId: log.id });

  // Rule 6: entertainment / rest is recorded but earns nothing.
  if (!c.isProductive || c.xpMultiplier <= 0 || NON_PRODUCTIVE_CATEGORIES.includes(c.category)) {
    return { xpAwarded: 0, skillXp: 0, reason: "non-productive" };
  }

  // Rules 2/4/5 context — did this log override a skipped/missed block, a
  // break, or free time? (Completed blocks already paid planned XP; the log
  // still earns because the user did MORE than planned — but overlapping an
  // already-completed block halves the log XP to avoid double-dipping.)
  let reason = "free-time";
  let overlapFactor = 1;
  const block = log.block_id
    ? ((await db.from("timetable_blocks").select("*").eq("id", log.block_id).maybeSingle()).data as TimetableBlockRow | null)
    : await findOverlappingBlock(userId, {
        startHour: log.start_hour,
        startMin: log.start_min,
        endHour: log.end_hour,
        endMin: log.end_min,
      });
  if (block) {
    const { data: stateRow } = await db
      .from("timetable_block_logs")
      .select("state")
      .eq("user_id", userId)
      .eq("block_id", block.id)
      .eq("date", log.date)
      .maybeSingle();
    const state = (stateRow?.state ?? "UPCOMING") as TimetableState;
    if (COMPLETED_STATES.includes(state)) {
      reason = "completed-block-extra";
      overlapFactor = 0.5; // planned XP already paid — halve the bonus
    } else if (state === "SKIPPED" || state === "MISSED") {
      reason = "skipped-block-override";
    } else if (block.category === "BREAK") {
      reason = "productive-break";
    } else {
      reason = "block-time";
    }
  }

  const rawXp = Math.round(estimateLogXp(minutes, c) * overlapFactor);
  const award =
    rawXp > 0
      ? await grantXp({
          userId,
          rawXp,
          attributeXp: attributeXpFor(c.category, minutes),
          coinReason: "FOCUS",
          source: `time-log:${c.category.toLowerCase()}`,
        })
      : { xpAwarded: 0, coinsAwarded: 0 };

  // Skill tree contribution — 1 unit per 10 productive minutes.
  const skillUnits = Math.floor(minutes / 10);
  const skillXp = await contributeSkillProgress(userId, log.id, c.suggestedSkill, skillUnits);

  // Persist totals on the log + audit row.
  const { error: upErr } = await db
    .from("time_logs")
    .update({ xp_awarded: award.xpAwarded, skill_xp: skillXp, ai_summary: c.insights || undefined })
    .eq("id", log.id);
  if (upErr) throw new Error(upErr.message);
  if (award.xpAwarded > 0) {
    const { error } = await db.from("time_log_xp").insert({
      time_log_id: log.id,
      user_id: userId,
      xp_awarded: award.xpAwarded,
      coins: award.coinsAwarded,
      reason,
    });
    if (error) throw new Error(error.message);
  }

  if (c.isDeepWork) await bumpMetric(userId, "deep_work_sessions", 1);

  return { xpAwarded: award.xpAwarded, skillXp, reason };
}

// ─────────────────── CRUD ───────────────────

export interface TimeLogInput {
  /** Game-day key YYYY-MM-DD; defaults to today. */
  date?: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  activity: string;
  category?: TimeLogCategory;
  description?: string;
  notes?: string;
  mood?: string;
  energyLevel?: number;
  location?: string;
  tags?: string[];
  /** Explicit planned-block link; auto-detected from overlap when omitted. */
  blockId?: string;
}

function logDate(input: { date?: string }): string {
  return input.date ? new Date(`${input.date}T00:00:00.000Z`).toISOString() : gameDay().toISOString();
}

export async function listTimeLogs(userId: string, dateKey?: string): Promise<TimeLogView[]> {
  let query = db.from("time_logs").select(LOG_SELECT).eq("user_id", userId);
  if (dateKey) query = query.eq("date", new Date(`${dateKey}T00:00:00.000Z`).toISOString());
  const { data, error } = await query.order("date", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const logs = (data as LogRowJoined[]).map(mapLog);
  return logs.sort((a, b) =>
    a.date === b.date ? minutesOf(a.startHour, a.startMin) - minutesOf(b.startHour, b.startMin) : 0,
  );
}

async function findLog(userId: string, id: string): Promise<TimeLogRow> {
  const { data, error } = await db
    .from("time_logs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new AppError("Time log not found", 404);
  return data as TimeLogRow;
}

/**
 * Create a log: classify with AI, link the overlapping block, award XP and
 * skill progress in one step.
 */
export async function createTimeLog(
  userId: string,
  input: TimeLogInput,
): Promise<{ log: TimeLogView; xpAwarded: number; skillXp: number }> {
  const minutes = logDurationMinutes(input);
  const classification = await classifyTimeLog({
    activity: input.activity,
    description: input.description,
    notes: input.notes,
    durationMinutes: minutes,
    category: input.category,
    energyLevel: input.energyLevel,
  });

  const block =
    input.blockId != null
      ? null // trust the explicit link; validated by FK
      : await findOverlappingBlock(userId, input);

  const { data, error } = await db
    .from("time_logs")
    .insert({
      user_id: userId,
      date: logDate(input),
      start_hour: input.startHour,
      start_min: input.startMin,
      end_hour: input.endHour,
      end_min: input.endMin,
      activity: input.activity,
      category: classification.category,
      description: input.description ?? "",
      notes: input.notes ?? "",
      mood: input.mood ?? "",
      energy_level: input.energyLevel ?? null,
      location: input.location ?? "",
      block_id: input.blockId ?? block?.id ?? null,
      ai_summary: classification.insights,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const row = data as TimeLogRow;

  if (input.tags && input.tags.length > 0) {
    const { error: tagErr } = await db.from("time_log_tags").insert(
      [...new Set(input.tags)].map((tag) => ({ time_log_id: row.id, user_id: userId, tag })),
    );
    if (tagErr) throw new Error(tagErr.message);
  }

  await saveAnalysis(userId, row.id, classification);
  const award = await awardForLog(userId, row, classification);

  const log = await findLogView(userId, row.id);
  return { log, xpAwarded: award.xpAwarded, skillXp: award.skillXp };
}

async function findLogView(userId: string, id: string): Promise<TimeLogView> {
  const { data, error } = await db
    .from("time_logs")
    .select(LOG_SELECT)
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return mapLog(data as LogRowJoined);
}

/** Edit a log (times/text/tags). XP is NOT re-awarded on edit. */
export async function updateTimeLog(
  userId: string,
  id: string,
  updates: Partial<TimeLogInput>,
): Promise<TimeLogView> {
  await findLog(userId, id);
  const patch: Record<string, unknown> = {};
  if (updates.date !== undefined) patch.date = logDate(updates as { date?: string });
  if (updates.startHour !== undefined) patch.start_hour = updates.startHour;
  if (updates.startMin !== undefined) patch.start_min = updates.startMin;
  if (updates.endHour !== undefined) patch.end_hour = updates.endHour;
  if (updates.endMin !== undefined) patch.end_min = updates.endMin;
  if (updates.activity !== undefined) patch.activity = updates.activity;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (updates.mood !== undefined) patch.mood = updates.mood;
  if (updates.energyLevel !== undefined) patch.energy_level = updates.energyLevel;
  if (updates.location !== undefined) patch.location = updates.location;
  if (updates.blockId !== undefined) patch.block_id = updates.blockId;

  if (Object.keys(patch).length > 0) {
    const { error } = await db.from("time_logs").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  }

  if (updates.tags !== undefined) {
    const { error: delErr } = await db.from("time_log_tags").delete().eq("time_log_id", id);
    if (delErr) throw new Error(delErr.message);
    if (updates.tags.length > 0) {
      const { error: insErr } = await db.from("time_log_tags").insert(
        [...new Set(updates.tags)].map((tag) => ({ time_log_id: id, user_id: userId, tag })),
      );
      if (insErr) throw new Error(insErr.message);
    }
  }
  return findLogView(userId, id);
}

export async function deleteTimeLog(userId: string, id: string): Promise<void> {
  await findLog(userId, id);
  const { error } = await db.from("time_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────── Analyze (preview) + explicit award ───────────────────

/** Classify without saving — used for the XP preview while typing. */
export async function analyzeTimeLog(
  userId: string,
  input: Omit<TimeLogInput, "tags">,
): Promise<{ classification: TimeLogClassification; estimatedXp: number }> {
  const minutes = logDurationMinutes(input);
  const classification = await classifyTimeLog({
    activity: input.activity,
    description: input.description,
    notes: input.notes,
    durationMinutes: minutes,
    category: input.category,
    energyLevel: input.energyLevel,
  });
  return { classification, estimatedXp: estimateLogXp(minutes, classification) };
}

/**
 * Explicitly (re-)award XP for an existing log (POST /time-logs/:id/award-xp
 * and the batch /time-logs/award-xp). No-ops on logs that already earned XP.
 */
export async function awardXpForLog(
  userId: string,
  id: string,
): Promise<{ xpAwarded: number; skillXp: number; reason: string }> {
  const log = await findLog(userId, id);
  const { data: analysisRow, error } = await db
    .from("time_log_ai_analysis")
    .select("*")
    .eq("time_log_id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  let classification: TimeLogClassification;
  if (analysisRow) {
    const a = analysisRow as TimeLogAiAnalysisRow;
    classification = {
      provider: a.provider === "gemini" ? "gemini" : "heuristic",
      category: a.category,
      difficulty: a.difficulty,
      productivityScore: a.productivity_score,
      focusScore: a.focus_score,
      suggestedSkill: a.suggested_skill,
      xpMultiplier: a.xp_multiplier,
      isProductive: a.is_productive,
      isDeepWork: a.is_deep_work,
      contributesToQuest: a.contributes_quest,
      suggestNewQuest: a.suggest_new_quest,
      insights: a.insights,
      raw: a.raw,
    };
  } else {
    classification = await classifyTimeLog({
      activity: log.activity,
      description: log.description,
      notes: log.notes,
      durationMinutes: logDurationMinutes({
        startHour: log.start_hour,
        startMin: log.start_min,
        endHour: log.end_hour,
        endMin: log.end_min,
      }),
      category: log.category,
    });
    await saveAnalysis(userId, id, classification);
  }
  return awardForLog(userId, log, classification);
}
