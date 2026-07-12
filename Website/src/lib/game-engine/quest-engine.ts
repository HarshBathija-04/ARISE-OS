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
 */

import type { Difficulty } from "@prisma/client";
import { QUEST_TEMPLATES, ANCHOR_KEYS, type QuestTemplateDef } from "./content/quest-templates";

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
}

export interface PlannedQuest extends QuestTemplateDef {
  reason: string; // why the engine chose this quest (shown to the player / AI Guide)
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

  // 3) Anchors. If struggling, trim to the 4 highest-leverage anchors.
  const anchorsForToday = struggling ? ANCHOR_KEYS.slice(0, 4) : ANCHOR_KEYS;
  for (const key of anchorsForToday) {
    push(key, struggling
      ? "Reduced anchor set — three tough days in a row. Win small, rebuild momentum."
      : "Anchor quest — the habit that defines who you're becoming.");
  }

  // 4) Recovery mode: add gentle recovery steps and stop early (light day).
  if (ctx.inRecovery) {
    push("meditate", "Recovery mode — a moment of stillness to reset.");
    push("mobility", "Recovery mode — move gently, no pressure.");
    return finalize(chosen, ctx.inRecovery ? 5 : 8);
  }

  // 5) Random fill from the rest of the pool, weighted + biased toward the
  //    weakest attribute, avoiding piling up a single category.
  const cap = struggling ? 5 : thriving ? 10 : 9;
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
    const candidates = QUEST_TEMPLATES.filter((q) => !used.has(q.key));
    if (candidates.length === 0) break;
    const pick = weightedPick(candidates, rng, weightOf);
    if (!pick) break;
    push(pick.key, weakest && pick.attributeXp[weakest]
      ? `Side quest — training your weakest area (${String(weakest)}).`
      : "Side quest drawn for today's variety.");
  }

  // 6) Thriving → upgrade one random side quest into a harder challenge.
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

/** Cap and return. Anchors are always kept even if over cap. */
function finalize(chosen: PlannedQuest[], cap: number): PlannedQuest[] {
  const anchors = chosen.filter((q) => (ANCHOR_KEYS as readonly string[]).includes(q.key));
  const rest = chosen.filter((q) => !(ANCHOR_KEYS as readonly string[]).includes(q.key));
  const limitedRest = rest.slice(0, Math.max(0, cap - anchors.length));
  return [...anchors, ...limitedRest];
}
