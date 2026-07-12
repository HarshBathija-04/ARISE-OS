/**
 * SOLO OS — Attribute Engine.
 *
 * 8 attributes, each leveled by its own XP curve:
 *   requiredXp(level) = round(100 * level^1.35)
 * (Kept in sync with soloos_award_attribute in supabase/migrations/0011.)
 *
 * Pure functions. Distributes an activity's attribute XP pool across the
 * mapped attributes, and applies XP with multi-level support.
 */
import type { AttributeCode, AttributeState, ActivityType, AttributeReward } from '@/types';
import { ACTIVITY_ATTRIBUTE_MAP, ATTRIBUTE_CODES } from '@/constants/attributes';

const ATTR_A = 100;
const ATTR_P = 1.35;

export function attributeRequiredXp(level: number): number {
  return Math.round(ATTR_A * Math.pow(Math.max(1, level), ATTR_P));
}

/** Create the 8 baseline attribute states for a new player. */
export function createInitialAttributes(): AttributeState[] {
  return ATTRIBUTE_CODES.map((code) => ({
    code,
    level: 1,
    currentXp: 0,
    requiredXp: attributeRequiredXp(1),
    lifetimeXp: 0,
    lastIncreaseAt: null,
  }));
}

export interface AttributeApplyResult {
  next: AttributeState;
  levelsGained: number;
}

/** Apply XP to a single attribute, handling multiple level-ups. */
export function applyAttributeXp(
  state: AttributeState,
  xp: number,
  atIso: string,
): AttributeApplyResult {
  if (xp <= 0) return { next: state, levelsGained: 0 };
  let { level, currentXp, requiredXp } = state;
  const lifetimeXp = state.lifetimeXp + xp;
  currentXp += xp;
  let levelsGained = 0;
  while (currentXp >= requiredXp) {
    currentXp -= requiredXp;
    level += 1;
    levelsGained += 1;
    requiredXp = attributeRequiredXp(level);
  }
  return {
    next: {
      ...state,
      level,
      currentXp,
      requiredXp,
      lifetimeXp,
      lastIncreaseAt: levelsGained > 0 ? atIso : state.lastIncreaseAt,
    },
    levelsGained,
  };
}

/**
 * Distribute an attribute-XP pool for an activity across mapped attributes,
 * proportional to their weights. Returns concrete per-attribute rewards.
 */
export function distributeActivityXp(
  activity: ActivityType,
  poolXp: number,
): AttributeReward[] {
  const weights = ACTIVITY_ATTRIBUTE_MAP[activity] ?? {};
  const entries = Object.entries(weights) as [AttributeCode, number][];
  const totalWeight = entries.reduce((s, [, w]) => s + w, 0);
  if (totalWeight === 0 || poolXp <= 0) return [];
  return entries.map(([code, w]) => ({
    code,
    xp: Math.max(1, Math.round((poolXp * w) / totalWeight)),
  }));
}

/** Merge a list of attribute rewards (sum duplicates). */
export function mergeAttributeRewards(rewards: AttributeReward[]): AttributeReward[] {
  const map = new Map<AttributeCode, number>();
  for (const r of rewards) map.set(r.code, (map.get(r.code) ?? 0) + r.xp);
  return [...map.entries()].map(([code, xp]) => ({ code, xp }));
}

/** 30-day growth for an attribute from history deltas. */
export function computeGrowth(
  history: { code: AttributeCode; xpDelta: number; createdAt: string }[],
  code: AttributeCode,
  sinceIso: string,
): number {
  const since = new Date(sinceIso).getTime();
  return history
    .filter((h) => h.code === code && new Date(h.createdAt).getTime() >= since)
    .reduce((s, h) => s + h.xpDelta, 0);
}
