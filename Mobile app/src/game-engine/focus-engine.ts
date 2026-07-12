/**
 * SOLO OS — Focus Engine.
 *
 * Computes XP for a focus session from ACTUAL active time, the objective
 * result, and anti-farming rules:
 *  - sessions under the minimum active time earn 0 XP
 *  - repeated short sessions have diminishing XP (handled via count today)
 *  - XP scales with real minutes, not planned minutes
 *  - objective result modulates the reward
 *
 * Pure functions. Distribution to attributes reuses the attribute engine.
 */
import type { FocusCategory, FocusObjectiveResult, AttributeReward } from '@/types';
import { FOCUS_MIN_ACTIVE_SECONDS } from './anti-farming-engine';
import { focusCategoryDef } from '@/constants/focus';
import { distributeActivityXp } from './attribute-engine';

/** Base XP per focused minute before modifiers. */
const XP_PER_MINUTE = 3;

const RESULT_MULTIPLIER: Record<FocusObjectiveResult, number> = {
  COMPLETED: 1.0,
  PARTIAL: 0.6,
  NOT_COMPLETED: 0.3,
};

export interface FocusXpContext {
  activeSeconds: number;
  result: FocusObjectiveResult;
  /** How many focus sessions already completed today (for diminishing returns). */
  sessionsToday: number;
  /** Focus XP already earned today (soft daily focus cap). */
  focusXpToday: number;
}

export interface FocusXpResult {
  xp: number;
  attributeRewards: AttributeReward[];
  note: string | null;
}

const DAILY_FOCUS_XP_CAP = 600;

export function computeFocusXp(
  category: FocusCategory,
  ctx: FocusXpContext,
): FocusXpResult {
  const notes: string[] = [];

  // Sessions under the minimum active time earn nothing.
  if (ctx.activeSeconds < FOCUS_MIN_ACTIVE_SECONDS) {
    return { xp: 0, attributeRewards: [], note: 'Below minimum active time — no XP.' };
  }

  const minutes = ctx.activeSeconds / 60;
  let xp = minutes * XP_PER_MINUTE;

  // Objective result modifier.
  xp *= RESULT_MULTIPLIER[ctx.result];

  // Diminishing returns for many sessions in one day.
  if (ctx.sessionsToday > 0) {
    const factor = Math.max(0.35, Math.pow(0.8, ctx.sessionsToday));
    if (factor < 1) notes.push(`session x${ctx.sessionsToday + 1}: ×${factor.toFixed(2)}`);
    xp *= factor;
  }

  xp = Math.max(1, Math.round(xp));

  // Daily focus soft cap.
  if (ctx.focusXpToday >= DAILY_FOCUS_XP_CAP) {
    const before = xp;
    xp = Math.max(1, Math.round(xp * 0.25));
    notes.push(`focus cap: ${before}→${xp}`);
  } else if (ctx.focusXpToday + xp > DAILY_FOCUS_XP_CAP) {
    const room = DAILY_FOCUS_XP_CAP - ctx.focusXpToday;
    if (xp > room) {
      notes.push(`focus cap crossing: ${xp}→${room}`);
      xp = Math.max(1, room);
    }
  }

  const def = focusCategoryDef(category);
  const attributeRewards = distributeActivityXp(def.activity, Math.round(xp * 0.6));

  return { xp, attributeRewards, note: notes.length ? notes.join('; ') : null };
}

/** Estimate XP for a planned session (shown live in the UI). */
export function estimateFocusXp(plannedMinutes: number, sessionsToday: number): number {
  const res = computeFocusXp('PROJECT_WORK', {
    activeSeconds: plannedMinutes * 60,
    result: 'COMPLETED',
    sessionsToday,
    focusXpToday: 0,
  });
  return res.xp;
}
