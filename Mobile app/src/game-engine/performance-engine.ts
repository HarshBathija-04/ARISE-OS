/**
 * SOLO OS — Life Performance Engine.
 *
 * Produces a 0..100 score across 5 categories with the spec's weights, using
 * a weighted rolling average so a single bad day cannot tank the score.
 *
 *   Discipline 25% · Knowledge 25% · Physical 20% · Focus 20% · Recovery 10%
 *   Rolling weight: recent 7 days 65% · previous 23 days 35%
 */
import type { PerformanceScore } from '@/types';

export const PERF_WEIGHTS = {
  discipline: 0.25,
  knowledge: 0.25,
  physical: 0.2,
  focus: 0.2,
  recovery: 0.1,
} as const;

export const ROLL_WEIGHT_RECENT = 0.65;
export const ROLL_WEIGHT_PREVIOUS = 0.35;

export interface CategoryWindow {
  /** Mean category score (0..100) over the recent 7 days. */
  recent7: number;
  /** Mean category score (0..100) over the previous 23 days. */
  previous23: number;
}

export interface PerformanceInput {
  discipline: CategoryWindow;
  knowledge: CategoryWindow;
  physical: CategoryWindow;
  focus: CategoryWindow;
  recovery: CategoryWindow;
}

function roll(w: CategoryWindow): number {
  const v = w.recent7 * ROLL_WEIGHT_RECENT + w.previous23 * ROLL_WEIGHT_PREVIOUS;
  return clamp(v);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function statusFromScore(score: number): string {
  if (score >= 85) return 'ASCENDING';
  if (score >= 70) return 'STABLE';
  if (score >= 50) return 'FLUCTUATING';
  if (score >= 30) return 'UNSTABLE';
  return 'CRITICAL';
}

/** Compute the full Life Performance Score. */
export function computePerformance(input: PerformanceInput): PerformanceScore {
  const categories = {
    discipline: roll(input.discipline),
    knowledge: roll(input.knowledge),
    physical: roll(input.physical),
    focus: roll(input.focus),
    recovery: roll(input.recovery),
  };
  const total = clamp(
    categories.discipline * PERF_WEIGHTS.discipline +
      categories.knowledge * PERF_WEIGHTS.knowledge +
      categories.physical * PERF_WEIGHTS.physical +
      categories.focus * PERF_WEIGHTS.focus +
      categories.recovery * PERF_WEIGHTS.recovery,
  );
  return { total, status: statusFromScore(total), categories };
}

/** Human-readable formula for the transparency screen. */
export const PERFORMANCE_FORMULA = [
  'LIFE PERFORMANCE SCORE',
  '',
  'score = Σ (categoryᵢ × weightᵢ)',
  '',
  'WEIGHTS',
  '  DISCIPLINE  25%',
  '  KNOWLEDGE   25%',
  '  PHYSICAL    20%',
  '  FOCUS       20%',
  '  RECOVERY    10%',
  '',
  'each category = rolling average',
  '  recent 7 days     × 65%',
  '  previous 23 days  × 35%',
  '',
  'One bad day cannot collapse the score:',
  'the 30-day window absorbs single dips.',
].join('\n');
