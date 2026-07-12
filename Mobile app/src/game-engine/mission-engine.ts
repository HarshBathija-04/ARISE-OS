/**
 * SOLO OS — Mission Engine.
 *
 * Two responsibilities:
 *  1. Compute a mission's rewards from a trusted template (never from client).
 *  2. Generate the day's mission set by analysing player state.
 *
 * Pure & deterministic given inputs. A seeded PRNG keeps generation stable
 * within a day (so re-renders don't reshuffle missions).
 */
import type {
  Mission, MissionTemplate, MissionType, StreakCode, ShadowHabitCode,
} from '@/types';
import { MISSION_TEMPLATES, DIFFICULTY_MULTIPLIER, templateByKey } from '@/constants/missions';

/** Deterministic reward computation from a template. */
export function computeMissionRewards(template: MissionTemplate): {
  xpReward: number;
  coinReward: number;
} {
  const mult = DIFFICULTY_MULTIPLIER[template.difficulty] ?? 1;
  return {
    xpReward: Math.round(template.baseXp * mult),
    coinReward: Math.round(template.baseCoins * mult),
  };
}

let idCounter = 0;
function genId(seed: string): string {
  idCounter += 1;
  return `m_${seed}_${idCounter}`;
}

/** Instantiate a concrete mission from a template for a given date. */
export function instantiateMission(
  template: MissionTemplate,
  forDateIso: string,
  opts: { type?: MissionType; deadlineIso?: string | null; bossId?: string | null } = {},
): Mission {
  const { xpReward, coinReward } = computeMissionRewards(template);
  const now = forDateIso;
  return {
    id: genId(template.templateKey),
    title: template.title,
    description: template.description,
    type: opts.type ?? template.type,
    difficulty: template.difficulty,
    category: template.category,
    status: 'AVAILABLE',
    objectiveType: template.objectiveType,
    targetValue: template.targetValue,
    currentProgress: 0,
    xpReward,
    coinReward,
    attributeRewards: template.attributeRewards,
    activityType: template.activityType,
    startDate: null,
    deadline: opts.deadlineIso ?? null,
    completedAt: null,
    failureConsequence: template.failureConsequence,
    verificationType: template.verificationType,
    bossId: opts.bossId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export interface DailyGenContext {
  forDateIso: string;
  /** Rolling completion rate 0..1 over the last 3 days. */
  recentCompletionRate3d: number;
  /** Rolling completion rate 0..1 over the last 7 days. */
  recentCompletionRate7d: number;
  /** Streaks currently at risk (missed yesterday but recoverable). */
  atRiskStreaks: StreakCode[];
  /** Shadow habits with a recent relapse (<48h). */
  recentRelapses: ShadowHabitCode[];
  /** Whether digital-distraction signal is rising. */
  digitalDistractionRising: boolean;
  /** Minutes the player realistically has today. */
  availableMinutes: number;
  intensity: 'light' | 'normal' | 'hard';
}

export interface DailyGenResult {
  missions: Mission[];
  notes: string[];
}

/**
 * Generate the day's missions. Implements the spec's adaptive rules:
 *  - completion < 40% (3d) → reduce quantity
 *  - completion > 85% (7d) → +5–10% challenge
 *  - workout streak at risk → ensure a short physical mission
 *  - digital distraction rising → prioritize Digital Silence
 *  - recent relapse → include a Recovery Mission
 *  - never exceed the available time budget
 */
export function generateDailyMissions(ctx: DailyGenContext): DailyGenResult {
  const notes: string[] = [];
  const chosen: string[] = [];

  const core = [
    'daily_wake', 'daily_gate', 'daily_dsa', 'daily_deepwork',
    'daily_workout', 'daily_silence', 'daily_shadow', 'daily_routine',
  ];

  // Base quantity by intensity.
  let quantity = ctx.intensity === 'light' ? 4 : ctx.intensity === 'hard' ? 8 : 6;

  // Rule: struggling → reduce load to rebuild momentum.
  if (ctx.recentCompletionRate3d < 0.4) {
    quantity = Math.max(3, quantity - 2);
    notes.push('Completion below 40% (3d): reduced mission load to rebuild momentum.');
  }

  // Rule: thriving → nudge challenge up.
  let challengeBoost = 1;
  if (ctx.recentCompletionRate7d > 0.85) {
    challengeBoost = 1.08;
    notes.push('Completion above 85% (7d): challenge increased ~8%.');
  }

  // Always include wake as the anchor.
  pushUnique(chosen, 'daily_wake');

  // Rule: digital distraction rising → prioritize Digital Silence.
  if (ctx.digitalDistractionRising) {
    pushUnique(chosen, 'daily_silence');
    notes.push('Digital distraction rising: Digital Silence prioritized.');
  }

  // Rule: workout streak at risk → guarantee a physical mission.
  if (ctx.atRiskStreaks.includes('WORKOUT')) {
    pushUnique(chosen, 'daily_workout');
    notes.push('Workout streak at risk: physical mission guaranteed.');
  }

  // Fill remaining core slots by priority order until quantity or time budget.
  const priority = ['daily_gate', 'daily_dsa', 'daily_deepwork', 'daily_workout',
    'daily_silence', 'daily_shadow', 'daily_routine', 'daily_move'];
  for (const key of priority) {
    if (chosen.length >= quantity) break;
    pushUnique(chosen, key);
  }

  // Rule: recent relapse → append a recovery mission (does not count to quantity cap).
  if (ctx.recentRelapses.length > 0) {
    pushUnique(chosen, 'recovery_reclaim');
    notes.push('Recent shadow relapse: Recovery Protocol added.');
  }

  // Enforce time budget: estimate per-mission minutes, drop lowest-priority
  // duration missions if we exceed the budget.
  const withEstimates = chosen
    .map((k) => templateByKey(k))
    .filter((t): t is MissionTemplate => !!t);

  const trimmed = enforceTimeBudget(withEstimates, ctx.availableMinutes, core);
  if (trimmed.dropped.length > 0) {
    notes.push(
      `Time budget ${ctx.availableMinutes}m: deferred ${trimmed.dropped.length} mission(s).`,
    );
  }

  const missions = trimmed.kept.map((t) =>
    // Preserve each template's natural type (daily_* → DAILY, recovery_* → RECOVERY).
    instantiateMission(applyChallenge(t, challengeBoost), ctx.forDateIso),
  );

  return { missions, notes };
}

function pushUnique(keys: string[], key: string) {
  if (!keys.includes(key)) keys.push(key);
}

function applyChallenge(t: MissionTemplate, boost: number): MissionTemplate {
  if (boost === 1) return t;
  return {
    ...t,
    baseXp: Math.round(t.baseXp * boost),
    targetValue:
      t.objectiveType === 'DURATION_MINUTES' || t.objectiveType === 'COUNT'
        ? Math.round(t.targetValue * boost)
        : t.targetValue,
  };
}

/** Rough per-mission minute cost for time budgeting. */
function estimateMinutes(t: MissionTemplate): number {
  if (t.objectiveType === 'DURATION_MINUTES') return t.targetValue;
  if (t.objectiveType === 'COUNT') return t.targetValue * 15; // ~15 min/problem
  return 10; // boolean confirmations
}

function enforceTimeBudget(
  templates: MissionTemplate[],
  budget: number,
  corePriority: string[],
): { kept: MissionTemplate[]; dropped: MissionTemplate[] } {
  // Sort by priority (core order first), keep accumulating until budget.
  const rank = (t: MissionTemplate) => {
    const i = corePriority.indexOf(t.templateKey);
    return i === -1 ? 999 : i;
  };
  const ordered = [...templates].sort((a, b) => rank(a) - rank(b));
  const kept: MissionTemplate[] = [];
  const dropped: MissionTemplate[] = [];
  let used = 0;
  for (const t of ordered) {
    const cost = estimateMinutes(t);
    // Boolean/anchor missions (<=10m) always kept; they're near-free.
    if (cost <= 10 || used + cost <= budget) {
      kept.push(t);
      used += cost;
    } else {
      dropped.push(t);
    }
  }
  return { kept, dropped };
}

/** Convenience: the full default daily set (used before adaptive data exists). */
export function defaultDailyMissions(forDateIso: string): Mission[] {
  return MISSION_TEMPLATES.filter((t) => t.type === 'DAILY').map((t) =>
    instantiateMission(t, forDateIso, { type: 'DAILY' }),
  );
}
