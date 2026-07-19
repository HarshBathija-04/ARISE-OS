/**
 * ═══════════════════════════════════════════════════════════════
 * QUEST GENERATION ENGINE
 * Seeded-random daily quest selection tuned to the player's state.
 * Pure planning logic — persistence happens in the server layer.
 * ═══════════════════════════════════════════════════════════════
 *
 * HOW IT WORKS
 *   - The set is seeded by (dayKey + userId): different every day, but stable
 *     within a day, so repeated generation on the same day yields the same set.
 *   - ANCHOR quests are always included (identity habits).
 *   - The rest are randomly sampled from the pool, weighted by `weight`, biased
 *     toward the weakest attribute, and varied across category/slot.
 *
 * ADAPTIVE RULES
 *   - completion < 40% for 3 days  → reduce quest volume (avoid overwhelm)
 *   - completion > 85% for 7 days  → add one harder challenge
 *   - a failing streak (wake/workout/dsa) → prioritise a re-entry quest for it
 *   - rising distraction            → inject a focus / digital-control quest
 *   - active recovery               → keep the day light, add recovery steps
 *
 * PERSONALIZATION (all deterministic per day+user)
 *   - GOAL quests: 2 of the user's active Main Quests are drawn each day; a
 *     synthesized MAIN quest targets the next incomplete stage and carries
 *     stageId/stageUnits so completing it advances that goal's progress.
 *   - ROUTINE quests: up to 2 of today's timetable blocks (study/exercise/
 *     networking/work) become "honor the schedule" quests.
 *   - HABIT anchors: anchors come from the user's OWN active habits (matched
 *     to a global template when one exists for the same streak, otherwise
 *     synthesized), so custom accounts get their custom dailies. The global
 *     ANCHOR_KEYS list is only the fallback for users with no habits.
 */

import type { AttributeKey, Difficulty } from "../db/tables.js";
import { QUEST_TEMPLATES, ANCHOR_KEYS, type QuestTemplateDef } from "./content/quest-templates.js";

/** An active Main Quest goal with its next incomplete stage. */
export interface GoalContext {
  goalTitle: string;
  stageId: string;
  stageTitle: string;
  stageDescription: string;
  progress: number;
  targetUnits: number;
}

/** A timetable block from today's schedule variant. */
export interface RoutineBlockContext {
  activity: string;
  category: string; // TimetableCategory
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
}

/** One of the user's own active habits. */
export interface HabitContext {
  key: string;
  title: string;
  streakKey?: string | null;
}

export interface QuestEngineContext {
  /** Stable per-day seed source (e.g. "2026-07-12"). */
  dayKey: string;
  /** Player id, mixed into the seed so different players get different sets. */
  userId: string;
  /** Rolling completion ratios for recent days, newest last. */
  recentCompletion: number[];
  /** Streak keys that are currently broken/at risk and should get a re-entry quest. */
  failingStreaks: string[];
  /** Distraction minutes yesterday (reels/shorts/unplanned). */
  distractionMinutesYesterday: number;
  /** Is a recovery quest currently active? */
  inRecovery: boolean;
  /** Player difficulty bias from settings (1.0 = normal). */
  difficultyBias: number;
  /** Weakest attribute key, to bias selection toward it. */
  weakestAttribute?: string;
  /** Active Main Quest goals (next incomplete stage each). */
  goals?: GoalContext[];
  /** Today's timetable blocks (already filtered to today's day type). */
  routineBlocks?: RoutineBlockContext[];
  /** The user's active BUILD habits — become the personal anchor set. */
  habits?: HabitContext[];
}

export interface PlannedQuest extends QuestTemplateDef {
  reason: string; // why the engine chose this quest (shown to the player / AI Guide)
  /** Main Quest stage this quest advances when completed (goal quests only). */
  stageId?: string;
  /** Progress units logged on stageId at completion. */
  stageUnits?: number;
}

const DIFF_ORDER: Difficulty[] = ["E", "D", "C", "B", "A", "S", "SS"];

function harder(d: Difficulty): Difficulty {
  const i = DIFF_ORDER.indexOf(d);
  return DIFF_ORDER[Math.min(DIFF_ORDER.length - 1, i + 1)]!;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0.6; // neutral prior for a brand-new player
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ─────────────────── Seeded PRNG (xmur3 hash → mulberry32) ───────────────────

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic RNG for a (day, user) pair. */
function seededRng(seed: string): () => number {
  const seedFn = xmur3(seed);
  return mulberry32(seedFn());
}

/** Weighted random pick from `pool` (without replacement handled by caller). */
function weightedPick(
  pool: QuestTemplateDef[],
  rng: () => number,
  weightOf: (q: QuestTemplateDef) => number,
): QuestTemplateDef | undefined {
  const total = pool.reduce((sum, q) => sum + Math.max(0, weightOf(q)), 0);
  if (total <= 0) return pool[Math.floor(rng() * pool.length)];
  let r = rng() * total;
  for (const q of pool) {
    r -= Math.max(0, weightOf(q));
    if (r <= 0) return q;
  }
  return pool[pool.length - 1];
}

/** Rotate a deterministic sample of `n` items out of `pool` for this day. */
function rotatingSample<T>(pool: T[], n: number, rng: () => number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]!);
  }
  return out;
}

/** Keyword → attribute mapping so synthesized quests train sensible stats. */
function attributesForText(text: string): Partial<Record<AttributeKey, number>> {
  const t = text.toLowerCase();
  if (/dsa|leetcode|competitive|algorithm|problem/.test(t)) return { INT: 12, FOC: 8 };
  if (/system design|architecture/.test(t)) return { INT: 10, SKL: 10 };
  if (/exercise|workout|run|gym|physical/.test(t)) return { STR: 12, END: 8 };
  if (/job|resume|interview|application/.test(t)) return { CON: 10, SKL: 8 };
  if (/linkedin|network|post|connect/.test(t)) return { CON: 12, SKL: 6 };
  if (/project|build|ship|develop|github|code/.test(t)) return { SKL: 12, INT: 6 };
  if (/language|studies|university|abroad/.test(t)) return { INT: 10, DIS: 8 };
  if (/news|read|tools|tech|research|explore/.test(t)) return { INT: 8, CON: 4 };
  if (/study|course|cert|learn|servicenow|aws|ml|ai/.test(t)) return { INT: 12, DIS: 6 };
  return { DIS: 8, INT: 6 };
}

function fmtTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Synthesize a MAIN quest that advances one of the user's goal stages. */
function goalQuest(g: GoalContext): PlannedQuest {
  const remaining = g.targetUnits - g.progress;
  // A day's quest advances ~5% of the stage (1..10 units).
  const units = Math.max(1, Math.min(10, Math.round(g.targetUnits / 20)));
  const nearDone = remaining <= units * 2;
  return {
    key: `goal:${g.stageId}`,
    title: `Advance: ${g.stageTitle}`,
    description: `${g.goalTitle} — ${g.stageDescription} (${g.progress}/${g.targetUnits} units done${nearDone ? ", the stage is within reach" : ""}).`,
    type: "MAIN",
    difficulty: nearDone ? "B" : "C",
    category: "goal",
    estMinutes: 45,
    baseXp: nearDone ? 95 : 80,
    attributeXp: attributesForText(`${g.goalTitle} ${g.stageTitle}`),
    coinReward: 15,
    failureNote: "The goal doesn't move unless you do.",
    reason: `Direct strike on "${g.goalTitle}" — today's push on the ${g.stageTitle} stage.`,
    stageId: g.stageId,
    stageUnits: units,
  };
}

/** Synthesize a DAILY quest that honors one of today's timetable blocks. */
function routineQuest(b: RoutineBlockContext): PlannedQuest {
  const window = `${fmtTime(b.startHour, b.startMin)}–${fmtTime(b.endHour, b.endMin)}`;
  const minutes = Math.max(15, (b.endHour * 60 + b.endMin) - (b.startHour * 60 + b.startMin));
  return {
    key: `routine:${b.category.toLowerCase()}:${b.startHour}`,
    title: `Honor the Schedule: ${b.activity}`,
    description: `Execute your ${window} block ("${b.activity}") as planned — start on time, no drift.`,
    type: "DAILY",
    difficulty: "D",
    category: "routine",
    estMinutes: Math.min(minutes, 240),
    baseXp: 45,
    attributeXp: b.category === "EXERCISE" ? { STR: 10, END: 6, DIS: 4 } : { DIS: 10, FOC: 6 },
    coinReward: 8,
    failureNote: "The schedule only works when it's real.",
    reason: `Drawn from today's routine — the ${window} "${b.activity}" block anchors your day.`,
  };
}

/** Synthesize a DAILY quest from one of the user's own habits. */
function habitQuest(h: HabitContext): PlannedQuest {
  return {
    key: `habit:${h.key}`,
    title: h.title,
    description: `Daily habit: ${h.title}. Small, repeatable, non-negotiable.`,
    type: "DAILY",
    difficulty: "D",
    category: "habit",
    estMinutes: 20,
    baseXp: 40,
    attributeXp: { DIS: 8, ...attributesForText(h.title) },
    coinReward: 5,
    streakKey: h.streakKey ?? undefined,
    failureNote: "Missed habits compound just like kept ones.",
    reason: "Your own habit — the engine keeps it in front of you.",
  };
}

export function generateDailyQuests(ctx: QuestEngineContext): PlannedQuest[] {
  const rng = seededRng(`${ctx.dayKey}::${ctx.userId}`);

  const last3 = ctx.recentCompletion.slice(-3);
  const last7 = ctx.recentCompletion.slice(-7);
  const struggling = last3.length === 3 && avg(last3) < 0.4;
  const thriving = last7.length >= 7 && avg(last7) > 0.85;

  const byKey = new Map(QUEST_TEMPLATES.map((t) => [t.key, t]));
  const chosen: PlannedQuest[] = [];
  const used = new Set<string>();
  const usedCategories = new Map<string, number>();

  const push = (key: string, reason: string, mutate?: (q: QuestTemplateDef) => QuestTemplateDef) => {
    if (used.has(key)) return;
    const t = byKey.get(key);
    if (!t) return;
    used.add(key);
    usedCategories.set(t.category, (usedCategories.get(t.category) ?? 0) + 1);
    chosen.push({ ...(mutate ? mutate(t) : t), reason });
  };

  /** Push a synthesized (non-template) quest. */
  const pushPlanned = (q: PlannedQuest) => {
    if (used.has(q.key)) return;
    used.add(q.key);
    usedCategories.set(q.category, (usedCategories.get(q.category) ?? 0) + 1);
    chosen.push(q);
  };

  // 1) Failing streaks get a gentle, prioritised re-entry quest.
  for (const streak of ctx.failingStreaks) {
    const t = QUEST_TEMPLATES.find((q) => q.streakKey === streak);
    if (t) {
      push(t.key, `Re-entry quest: your ${streak} streak needs rebuilding — kept approachable.`, (q) => ({
        ...q,
        // Ease difficulty by one step for re-entry so it's winnable.
        difficulty: DIFF_ORDER[Math.max(0, DIFF_ORDER.indexOf(q.difficulty) - 1)]!,
      }));
    }
  }

  // 2) Rising distraction → force a focus / digital-control quest.
  if (ctx.distractionMinutesYesterday > 60) {
    push("no-reels-day", "Distraction spiked yesterday — reclaiming your attention is today's priority.");
    push("deep-work-1", "A deep work block to rebuild focus after high distraction.");
  }

  // 3) Anchors — the user's OWN habits when they have any (rotating subset,
  //    matched to a global template by streak when possible), otherwise the
  //    global anchor set. If struggling, trim the anchor count.
  const anchorReason = struggling
    ? "Reduced anchor set — three tough days in a row. Win small, rebuild momentum."
    : "Anchor quest — the habit that defines who you're becoming.";
  const habits = ctx.habits ?? [];
  if (habits.length > 0) {
    const anchorCount = struggling ? 3 : 4;
    for (const h of rotatingSample(habits, anchorCount, rng)) {
      const tmpl = h.streakKey
        ? QUEST_TEMPLATES.find((q) => q.streakKey === h.streakKey)
        : undefined;
      if (tmpl) push(tmpl.key, anchorReason);
      else pushPlanned({ ...habitQuest(h), reason: anchorReason });
    }
  } else {
    const anchorsForToday = struggling ? ANCHOR_KEYS.slice(0, 4) : ANCHOR_KEYS;
    for (const key of anchorsForToday) push(key, anchorReason);
  }

  // 4) Recovery mode: add gentle recovery steps and stop early (light day).
  if (ctx.inRecovery) {
    push("meditate", "Recovery mode — a moment of stillness to reset.");
    push("mobility", "Recovery mode — move gently, no pressure.");
    return finalize(chosen, 5);
  }

  // 5) GOAL quests — rotate through the active Main Quests so every goal gets
  //    regular pushes without flooding a single day.
  const goals = ctx.goals ?? [];
  for (const g of rotatingSample(goals, struggling ? 1 : 2, rng)) {
    pushPlanned(goalQuest(g));
  }

  // 6) ROUTINE quests — pick meaningful blocks from today's schedule variant.
  const ROUTINE_CATEGORIES = new Set(["STUDY", "EXERCISE", "NETWORKING", "WORK"]);
  const eligibleBlocks = (ctx.routineBlocks ?? []).filter((b) => ROUTINE_CATEGORIES.has(b.category));
  for (const b of rotatingSample(eligibleBlocks, struggling ? 1 : 2, rng)) {
    pushPlanned(routineQuest(b));
  }

  // 7) Random fill from the rest of the pool, weighted + biased toward the
  //    weakest attribute, avoiding piling up a single category. For users with
  //    their own habit set, templates tied to a streak they don't pursue
  //    (e.g. GATE study for a non-GATE account) are excluded from the pool.
  const cap = struggling ? 6 : thriving ? 11 : 10;
  const pursued = new Set(habits.map((h) => h.streakKey).filter(Boolean));
  const streakOf = (q: QuestTemplateDef): string | null =>
    q.streakKey ??
    (q.key.startsWith("gate") || q.key === "mock-test" ? "gate"
      : q.key.startsWith("dsa") ? "dsa"
      : q.key === "wake-5am" ? "wake"
      : null);
  const fitsUser = (q: QuestTemplateDef): boolean => {
    if (habits.length === 0) return true; // no personal habit set → whole pool
    const s = streakOf(q);
    return !s || pursued.has(s);
  };
  const weakest = ctx.weakestAttribute as keyof QuestTemplateDef["attributeXp"] | undefined;

  const weightOf = (q: QuestTemplateDef): number => {
    let w = q.weight ?? 5;
    // Bias toward quests that train the weakest attribute.
    if (weakest && q.attributeXp[weakest]) w *= 1.8;
    // Discourage stacking the same category too many times.
    const catCount = usedCategories.get(q.category) ?? 0;
    w *= 1 / (1 + catCount * 0.6);
    return w;
  };

  let guard = 0;
  while (chosen.length < cap && guard < 200) {
    guard++;
    const candidates = QUEST_TEMPLATES.filter((q) => !used.has(q.key) && fitsUser(q));
    if (candidates.length === 0) break;
    const pick = weightedPick(candidates, rng, weightOf);
    if (!pick) break;
    push(pick.key, weakest && pick.attributeXp[weakest]
      ? `Side quest — training your weakest area (${String(weakest)}).`
      : "Side quest drawn for today's variety.");
  }

  // 8) Thriving → upgrade one random side quest into a harder challenge.
  if (thriving) {
    const sideChosen = chosen.filter((q) => q.type === "SIDE");
    if (sideChosen.length > 0) {
      const target = sideChosen[Math.floor(rng() * sideChosen.length)]!;
      const idx = chosen.findIndex((q) => q.key === target.key);
      if (idx >= 0) {
        chosen[idx] = {
          ...chosen[idx]!,
          difficulty: harder(chosen[idx]!.difficulty),
          baseXp: Math.round(chosen[idx]!.baseXp * 1.15),
          reason: "Seven strong days — the System raises the challenge.",
        };
      }
    }
  }

  return finalize(chosen, cap);
}

/** Cap and return. Anchors, habit quests and goal quests always survive the cap. */
function finalize(chosen: PlannedQuest[], cap: number): PlannedQuest[] {
  const isProtected = (q: PlannedQuest) =>
    (ANCHOR_KEYS as readonly string[]).includes(q.key) ||
    q.key.startsWith("habit:") ||
    q.key.startsWith("goal:");
  const protectedQuests = chosen.filter(isProtected);
  const rest = chosen.filter((q) => !isProtected(q));
  const limitedRest = rest.slice(0, Math.max(0, cap - protectedQuests.length));
  return [...protectedQuests, ...limitedRest];
}
