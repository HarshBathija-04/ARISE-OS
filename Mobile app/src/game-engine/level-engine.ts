/**
 * SOLO OS — Level Engine.
 *
 * 100 levels. XP curve (kept in EXACT sync with the server, see
 * supabase/migrations/0010):
 *
 *   xpRequirement(L) = round(10 * L^1.55) + 10 * L      for L in 1..99
 *   xpRequirement(100) = 0  (max level)
 *
 * Total lifetime XP to reach L100 ≈ 537,000 → ~1.5 yr at a strong pace,
 * ~2.5 yr at a moderate pace. Satisfies "one year or more of consistency".
 *
 * All functions are pure and deterministic. This is the authoritative
 * client-side mirror; the server recomputes independently and wins on sync.
 */
import type { LevelProgress, RankName } from '@/types';
import { RANK_TIERS, MAX_LEVEL } from '@/constants/ranks';

const CURVE_A = 10;
const CURVE_P = 1.55;
const CURVE_LIN = 10;

/** XP needed to go from `level` → `level + 1`. */
export function getXPRequirement(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  if (level < 1) return 0;
  return Math.round(CURVE_A * Math.pow(level, CURVE_P)) + CURVE_LIN * level;
}

// Precompute cumulative XP thresholds once (index = level).
// cumulative[L] = total lifetime XP required to *reach* level L.
const CUMULATIVE: number[] = (() => {
  const arr = new Array(MAX_LEVEL + 1).fill(0);
  let sum = 0;
  for (let l = 1; l < MAX_LEVEL; l++) {
    arr[l] = sum;
    sum += getXPRequirement(l);
  }
  arr[MAX_LEVEL] = sum;
  return arr;
})();

/** Total lifetime XP required to reach a given level. */
export function getCumulativeXP(level: number): number {
  if (level <= 1) return 0;
  if (level >= MAX_LEVEL) return CUMULATIVE[MAX_LEVEL];
  return CUMULATIVE[level];
}

/** Total XP to fully complete the game (reach L100). */
export const TOTAL_XP_TO_MAX = CUMULATIVE[MAX_LEVEL];

/** Determine level (1..100) from lifetime XP. */
export function getLevelFromLifetimeXP(lifetimeXp: number): number {
  const xp = Math.max(0, Math.floor(lifetimeXp));
  // Linear scan is fine (100 entries); binary search would be overkill.
  let level = 1;
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (xp >= CUMULATIVE[l]) {
      level = l;
      break;
    }
  }
  return level;
}

/** Rank name for a level. */
export function getRankFromLevel(level: number): RankName {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, level));
  const tier = RANK_TIERS.find(
    (t) => clamped >= t.minLevel && clamped <= t.maxLevel,
  );
  return tier?.name ?? 'INITIATE';
}

/** Full progress breakdown for a lifetime XP total. */
export function getLevelProgress(lifetimeXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(lifetimeXp));
  const level = getLevelFromLifetimeXP(xp);
  const isMax = level >= MAX_LEVEL;
  const floor = getCumulativeXP(level);
  const need = getXPRequirement(level);
  const into = xp - floor;
  return {
    level,
    rank: getRankFromLevel(level),
    currentXpIntoLevel: into,
    xpForThisLevel: need,
    lifetimeXp: xp,
    progress: isMax ? 1 : need > 0 ? Math.min(1, into / need) : 0,
    isMax,
  };
}

export interface LevelIncreaseResult {
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  oldRank: RankName;
  newRank: RankName;
  rankChanged: boolean;
  newLifetimeXp: number;
  progress: LevelProgress;
}

/**
 * Process an XP award against a current lifetime total. Supports multiple
 * level increases in one award. Never lets XP go negative.
 */
export function processLevelIncrease(
  currentLifetimeXp: number,
  xpAwarded: number,
): LevelIncreaseResult {
  const before = Math.max(0, Math.floor(currentLifetimeXp));
  const after = Math.max(0, before + Math.floor(xpAwarded));
  const oldLevel = getLevelFromLifetimeXP(before);
  const newLevel = getLevelFromLifetimeXP(after);
  const oldRank = getRankFromLevel(oldLevel);
  const newRank = getRankFromLevel(newLevel);
  return {
    oldLevel,
    newLevel,
    levelsGained: Math.max(0, newLevel - oldLevel),
    oldRank,
    newRank,
    rankChanged: oldRank !== newRank,
    newLifetimeXp: after,
    progress: getLevelProgress(after),
  };
}
