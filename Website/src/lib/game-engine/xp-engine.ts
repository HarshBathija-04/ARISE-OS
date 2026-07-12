/**
 * ═══════════════════════════════════════════════════════════════
 * XP ENGINE — the single source of truth for all XP math.
 * Nothing outside this file should invent XP numbers.
 * ═══════════════════════════════════════════════════════════════
 *
 * LEVEL CURVE
 *   xpForLevel(L) = XP required to advance FROM level L to L+1
 *                 = round(BASE_XP * L^EXP)
 *   BASE_XP = 100, EXP = 1.5
 *
 * Cumulative XP to reach level 100 ≈ 4,000,000 XP.
 * A strong, consistent day yields ~4,000–8,000 XP (before soft cap),
 * so Level 100 requires roughly 1.5–2.5 years of genuine consistency.
 * A few weeks of grinding cannot reach it — by design.
 *
 * DIFFICULTY reflects real effort. Harder quests pay disproportionately
 * more, so farming trivial tasks is never optimal.
 */

import type { AttributeKey, Difficulty, QuestStatus } from "@prisma/client";

export const BASE_XP = 100;
export const LEVEL_EXP = 1.5;
export const MAX_LEVEL = 100;
export const DAILY_XP_SOFT_CAP = 8000;

/** XP required to go from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(BASE_XP * Math.pow(level, LEVEL_EXP));
}

/** Cumulative XP required to reach `level` from level 1 (level 1 = 0). */
export function cumulativeXpToLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForLevel(l);
  return total;
}

export interface LevelState {
  level: number;
  currentXp: number; // XP inside the current level
  xpForNext: number; // XP needed to clear the current level
  totalXp: number;
}

/**
 * Apply an XP gain to a level state, cascading through multiple level-ups.
 * Pure function — callers persist the returned state.
 */
export function applyXp(state: LevelState, gain: number): LevelState {
  let level = state.level;
  let currentXp = state.currentXp + gain;
  let totalXp = state.totalXp + gain;

  while (level < MAX_LEVEL) {
    const need = xpForLevel(level);
    if (currentXp < need) break;
    currentXp -= need;
    level += 1;
  }

  if (level >= MAX_LEVEL) {
    level = MAX_LEVEL;
    currentXp = 0;
  }

  return { level, currentXp, xpForNext: xpForLevel(level), totalXp };
}

// ─────────────────── Difficulty ───────────────────

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  E: 1.0,
  D: 1.4,
  C: 1.9,
  B: 2.6,
  A: 3.5,
  S: 4.8,
  SS: 6.5,
};

export function difficultyMultiplier(d: Difficulty): number {
  return DIFFICULTY_MULTIPLIER[d];
}

// ─────────────────── Quest XP ───────────────────

/** Completion quality → XP ratio. Partial pays half; failed pays nothing. */
export function qualityRatio(result: QuestStatus): number {
  switch (result) {
    case "COMPLETED":
      return 1;
    case "PARTIAL":
      return 0.5;
    default:
      return 0;
  }
}

export interface QuestXpInput {
  baseXp: number;
  difficulty: Difficulty;
  result: QuestStatus;
  streakDays?: number; // current streak on this quest's streakKey
  /** How many times an equivalent quest was already completed today (anti-farm). */
  repeatIndexToday?: number;
  /** Equipped title bonus, e.g. 0.02 for +2%. */
  titleBonusPct?: number;
}

/**
 * Diminishing returns for repeating the same trivial task within a day.
 * 1st = 100%, 2nd = 70%, 3rd = 49%, ... floors at 15%.
 */
export function antiFarmFactor(repeatIndexToday: number): number {
  if (repeatIndexToday <= 0) return 1;
  return Math.max(0.15, Math.pow(0.7, repeatIndexToday));
}

/** Streak bonus: +4% per day, capped at +40%. */
export function streakBonus(streakDays: number): number {
  return Math.min(0.4, Math.max(0, streakDays) * 0.04);
}

export function calculateQuestXP(input: QuestXpInput): number {
  const {
    baseXp,
    difficulty,
    result,
    streakDays = 0,
    repeatIndexToday = 0,
    titleBonusPct = 0,
  } = input;

  const quality = qualityRatio(result);
  if (quality === 0) return 0;

  const raw =
    baseXp *
    difficultyMultiplier(difficulty) *
    quality *
    antiFarmFactor(repeatIndexToday) *
    (1 + streakBonus(streakDays) + titleBonusPct);

  return Math.round(raw);
}

// ─────────────────── Focus XP ───────────────────

/**
 * Focus sessions pay for *active* minutes, not just clock time, to prevent
 * "start timer and walk away" farming.
 *  - minimum 10 active minutes to earn anything
 *  - ~2.2 XP per active minute, scaled by result and category weight
 */
export const FOCUS_MIN_MINUTES = 10;
export const FOCUS_XP_PER_MIN = 2.2;

export function focusResultRatio(result: "COMPLETE" | "PARTIAL" | "ABANDONED"): number {
  switch (result) {
    case "COMPLETE":
      return 1;
    case "PARTIAL":
      return 0.55;
    case "ABANDONED":
      return 0.15;
  }
}

export function calculateFocusXP(params: {
  actualMinutes: number;
  plannedMinutes: number;
  result: "COMPLETE" | "PARTIAL" | "ABANDONED";
  titleBonusPct?: number;
}): number {
  const { actualMinutes, plannedMinutes, result, titleBonusPct = 0 } = params;
  if (actualMinutes < FOCUS_MIN_MINUTES) return 0;

  // Reward depth: sessions ≥ 50 min get a focus-stamina bonus.
  const depthBonus = actualMinutes >= 90 ? 1.25 : actualMinutes >= 50 ? 1.12 : 1;
  const effective = Math.min(actualMinutes, plannedMinutes * 1.2); // no credit for wildly over-claiming

  return Math.round(
    effective * FOCUS_XP_PER_MIN * focusResultRatio(result) * depthBonus * (1 + titleBonusPct),
  );
}

// ─────────────────── Attribute XP ───────────────────

/**
 * Attributes use the same L^1.5 curve but a smaller base so they level
 * a little faster than the player (attributes feel responsive).
 */
export const ATTR_BASE_XP = 60;

export function attrXpForLevel(level: number): number {
  return Math.round(ATTR_BASE_XP * Math.pow(level, LEVEL_EXP));
}

export function applyAttributeXp(
  state: { level: number; xp: number; totalXp: number },
  gain: number,
): { level: number; xp: number; totalXp: number; leveledUp: boolean } {
  let { level } = state;
  let xp = state.xp + gain;
  const totalXp = state.totalXp + gain;
  let leveledUp = false;

  while (xp >= attrXpForLevel(level)) {
    xp -= attrXpForLevel(level);
    level += 1;
    leveledUp = true;
  }
  return { level, xp, totalXp, leveledUp };
}

/** Scale a quest/focus's declared attribute XP map by the same quality/streak factors. */
export function calculateAttributeXP(
  baseMap: Partial<Record<AttributeKey, number>>,
  factor: number,
): Partial<Record<AttributeKey, number>> {
  const out: Partial<Record<AttributeKey, number>> = {};
  for (const [k, v] of Object.entries(baseMap)) {
    if (typeof v === "number") out[k as AttributeKey] = Math.round(v * factor);
  }
  return out;
}

// ─────────────────── Daily soft cap ───────────────────

/**
 * Beyond the soft cap, additional XP is compressed to 25% so a single huge day
 * cannot trivialise the curve, without ever punishing genuine work with 0.
 */
export function applyDailySoftCap(alreadyEarnedToday: number, incoming: number): number {
  const remaining = Math.max(0, DAILY_XP_SOFT_CAP - alreadyEarnedToday);
  if (incoming <= remaining) return incoming;
  const over = incoming - remaining;
  return Math.round(remaining + over * 0.25);
}

/** Coins scale gently with XP; harder/rarer work pays more coins. */
export function coinsForXp(xp: number): number {
  return Math.max(0, Math.round(xp / 20));
}
