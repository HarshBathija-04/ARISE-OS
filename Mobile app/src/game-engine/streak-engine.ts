/**
 * SOLO OS — Streak Engine.
 *
 * 8 streaks with current/longest tracking, Streak Shields, and daily
 * success/failure management.
 *
 * Rules:
 *  - A shield earns after 7 consecutive exceptional days.
 *  - Maximum 3 shields.
 *  - One shield protects one streak from one missed day.
 *  - Shadow habit shield behaviour is configurable.
 */
import type { Streak, StreakCode } from '@/types';

// ── Streak definitions ────────────────────────────────────────────

export interface StreakDef {
  code: StreakCode;
  label: string;
  description: string;
}

export const STREAK_DEFS: StreakDef[] = [
  { code: 'WAKE', label: 'WAKE STREAK', description: 'Consecutive days waking before target.' },
  { code: 'GATE', label: 'GATE STREAK', description: 'Consecutive GATE study days.' },
  { code: 'DSA', label: 'DSA STREAK', description: 'Consecutive DSA practice days.' },
  { code: 'WORKOUT', label: 'WORKOUT STREAK', description: 'Consecutive workout days.' },
  { code: 'DEEP_WORK', label: 'DEEP WORK STREAK', description: 'Consecutive deep work days.' },
  { code: 'DIGITAL_SILENCE', label: 'DIGITAL SILENCE STREAK', description: 'Consecutive Reels/Shorts-free days.' },
  { code: 'SHADOW_CONTROL', label: 'SHADOW CONTROL STREAK', description: 'Consecutive shadow control days.' },
  { code: 'ROUTINE', label: 'ROUTINE STREAK', description: 'Consecutive routine completion days.' },
];

// ── Initial states ────────────────────────────────────────────────

export function createInitialStreaks(): Streak[] {
  return STREAK_DEFS.map((d) => ({
    code: d.code,
    label: d.label,
    currentStreak: 0,
    longestStreak: 0,
    lastSuccessDate: null,
    lastFailureDate: null,
    shielded: false,
  }));
}

// ── Shield system ─────────────────────────────────────────────────

export const MAX_SHIELDS = 3;
export const SHIELD_EARN_THRESHOLD = 7;

export interface StreakShieldState {
  count: number;
  exceptionalDays: number; // consecutive days with 100% completion
}

export function createInitialShieldState(): StreakShieldState {
  return { count: 0, exceptionalDays: 0 };
}

/**
 * Update shield state after a day.
 * An "exceptional day" is one where all core missions were completed.
 */
export function updateShieldState(
  state: StreakShieldState,
  isExceptionalDay: boolean,
): StreakShieldState {
  if (!isExceptionalDay) {
    return { ...state, exceptionalDays: 0 };
  }
  const newExceptional = state.exceptionalDays + 1;
  if (newExceptional >= SHIELD_EARN_THRESHOLD && state.count < MAX_SHIELDS) {
    return {
      count: state.count + 1,
      exceptionalDays: 0, // reset counter after earning
    };
  }
  return { ...state, exceptionalDays: newExceptional };
}

/**
 * Consume a shield to protect a streak from resetting.
 * Returns the new shield count, or null if no shield available.
 */
export function consumeShield(
  shieldState: StreakShieldState,
): StreakShieldState | null {
  if (shieldState.count <= 0) return null;
  return { ...shieldState, count: shieldState.count - 1 };
}

// ── Streak update logic ───────────────────────────────────────────

export interface StreakUpdateResult {
  streak: Streak;
  wasReset: boolean;
  shieldUsed: boolean;
  milestone: number | null; // e.g. 7, 14, 30, 60, 100
}

const MILESTONES = [7, 14, 21, 30, 60, 90, 100, 150, 200, 365];

/**
 * Record a success for today. Idempotent for the same date.
 */
export function recordStreakSuccess(
  streak: Streak,
  todayKey: string,
): StreakUpdateResult {
  // Already recorded for today.
  if (streak.lastSuccessDate === todayKey) {
    return { streak, wasReset: false, shieldUsed: false, milestone: null };
  }

  const newStreak = streak.currentStreak + 1;
  const newLongest = Math.max(streak.longestStreak, newStreak);
  const milestone = MILESTONES.includes(newStreak) ? newStreak : null;

  return {
    streak: {
      ...streak,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastSuccessDate: todayKey,
      shielded: false,
    },
    wasReset: false,
    shieldUsed: false,
    milestone,
  };
}

/**
 * Record a failure. Optionally uses a shield.
 * @param allowShield - Whether this streak type can be protected by a shield.
 * @param shieldAvailable - Whether a shield is available.
 */
export function recordStreakFailure(
  streak: Streak,
  todayKey: string,
  opts: { allowShield: boolean; shieldAvailable: boolean } = { allowShield: true, shieldAvailable: false },
): StreakUpdateResult {
  // If shield is available and allowed, protect the streak.
  if (opts.allowShield && opts.shieldAvailable && streak.currentStreak > 0) {
    return {
      streak: {
        ...streak,
        shielded: true,
        lastSuccessDate: todayKey, // treat as continued
      },
      wasReset: false,
      shieldUsed: true,
      milestone: null,
    };
  }

  // Reset the streak.
  return {
    streak: {
      ...streak,
      currentStreak: 0,
      lastFailureDate: todayKey,
      shielded: false,
    },
    wasReset: true,
    shieldUsed: false,
    milestone: null,
  };
}

// ── Heatmap data generation ───────────────────────────────────────

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  value: number; // 0..1 (0 = no activity, 1 = full)
}

/**
 * Generate 90-day heatmap data from streak success dates.
 * This is a simple version — full implementation uses activity log data.
 */
export function generateHeatmapData(
  successDates: string[],
  days: number = 90,
): HeatmapDay[] {
  const set = new Set(successDates);
  const result: HeatmapDay[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, value: set.has(key) ? 1 : 0 });
  }

  return result;
}

/** Streak codes that are sensitive (shadow-related). */
export const SHADOW_STREAK_CODES: StreakCode[] = ['SHADOW_CONTROL'];

/** Check if a streak is shadow-related for shield policy. */
export function isShadowStreak(code: StreakCode): boolean {
  return SHADOW_STREAK_CODES.includes(code);
}
