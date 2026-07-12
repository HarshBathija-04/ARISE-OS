/**
 * ═══════════════════════════════════════════════════════════════
 * LIFE PERFORMANCE ENGINE
 * Produces five 0–100 sub-scores and an overall 0–100 Life Score.
 * ═══════════════════════════════════════════════════════════════
 *
 * PHILOSOPHY
 *   - Scores are ROLLING, not daily: they blend a 7-day window (weight 0.7)
 *     with a 30-day window (weight 0.3). One bad day cannot crater the score;
 *     one great day cannot fake sustained progress.
 *   - Every component is normalised against a realistic daily TARGET, clamped
 *     to [0, 1], then averaged across the window.
 *
 * OVERALL WEIGHTS
 *   Discipline 25% · Knowledge 25% · Physical 20% · Focus 20% · Recovery 10%
 */

import { clamp } from "@/lib/utils";

/** One day of already-aggregated, normalised-friendly raw metrics. */
export interface DailyMetric {
  dayKey: string;
  // discipline
  wokeOnTime: boolean;
  routineCompletionRatio: number; // 0..1 of daily quests completed
  // knowledge
  studyMinutes: number;
  dsaSolved: number;
  gateMinutes: number;
  // physical
  workout: boolean;
  runKm: number;
  steps: number;
  // focus
  deepWorkSessions: number;
  focusMinutes: number;
  distractionMinutes: number; // reels + shorts + unplanned
  // recovery
  sleepHours: number;
  cleanDay: boolean; // no shadow-habit relapse
  urgesResistedRatio: number; // resisted / max(1, total urges)
}

/** Daily targets that define "100%" for each component. */
export const TARGETS = {
  studyMinutes: 180,
  dsaSolved: 3,
  gateMinutes: 120,
  runKm: 3,
  steps: 8000,
  deepWorkSessions: 2,
  focusMinutes: 120,
  distractionMinutes: 45, // budget; above this the focus score erodes
  sleepHours: 7,
} as const;

export interface PerformanceScores {
  discipline: number;
  knowledge: number;
  physical: number;
  focus: number;
  recovery: number;
  life: number;
}

const norm = (value: number, target: number) => clamp(value / target, 0, 1);

function dayDiscipline(m: DailyMetric): number {
  const wake = m.wokeOnTime ? 1 : 0;
  const routine = clamp(m.routineCompletionRatio, 0, 1);
  return 100 * (0.45 * wake + 0.55 * routine);
}

function dayKnowledge(m: DailyMetric): number {
  const study = norm(m.studyMinutes, TARGETS.studyMinutes);
  const dsa = norm(m.dsaSolved, TARGETS.dsaSolved);
  const gate = norm(m.gateMinutes, TARGETS.gateMinutes);
  return 100 * (0.4 * study + 0.3 * dsa + 0.3 * gate);
}

function dayPhysical(m: DailyMetric): number {
  const workout = m.workout ? 1 : 0;
  const run = norm(m.runKm, TARGETS.runKm);
  const steps = norm(m.steps, TARGETS.steps);
  return 100 * (0.5 * workout + 0.25 * run + 0.25 * steps);
}

function dayFocus(m: DailyMetric): number {
  const sessions = norm(m.deepWorkSessions, TARGETS.deepWorkSessions);
  const minutes = norm(m.focusMinutes, TARGETS.focusMinutes);
  // distraction penalty: at/under budget = no penalty; scales down beyond it.
  const distractionPenalty = clamp(
    (m.distractionMinutes - TARGETS.distractionMinutes) / 120,
    0,
    1,
  );
  const base = 0.55 * sessions + 0.45 * minutes;
  return 100 * clamp(base * (1 - 0.5 * distractionPenalty), 0, 1);
}

function dayRecovery(m: DailyMetric): number {
  // Sleep is best near target; both too little and too much reduce the score.
  const sleepDelta = Math.abs(m.sleepHours - TARGETS.sleepHours);
  const sleep = clamp(1 - sleepDelta / 4, 0, 1);
  const clean = m.cleanDay ? 1 : clamp(m.urgesResistedRatio, 0, 1) * 0.6;
  return 100 * (0.6 * sleep + 0.4 * clean);
}

function windowAverage(days: DailyMetric[], fn: (m: DailyMetric) => number): number {
  if (days.length === 0) return 0;
  return days.reduce((sum, d) => sum + fn(d), 0) / days.length;
}

/** Blend a 7-day and 30-day window (0.7 / 0.3). */
function rolling(days: DailyMetric[], fn: (m: DailyMetric) => number): number {
  const sorted = [...days].sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1)); // newest first
  const last7 = sorted.slice(0, 7);
  const last30 = sorted.slice(0, 30);
  const s7 = windowAverage(last7, fn);
  const s30 = windowAverage(last30, fn);
  return Math.round(0.7 * s7 + 0.3 * s30);
}

export function computePerformance(days: DailyMetric[]): PerformanceScores {
  const discipline = rolling(days, dayDiscipline);
  const knowledge = rolling(days, dayKnowledge);
  const physical = rolling(days, dayPhysical);
  const focus = rolling(days, dayFocus);
  const recovery = rolling(days, dayRecovery);

  const life = Math.round(
    0.25 * discipline +
      0.25 * knowledge +
      0.2 * physical +
      0.2 * focus +
      0.1 * recovery,
  );

  return { discipline, knowledge, physical, focus, recovery, life };
}
