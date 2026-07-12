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

// ─────────────────── Seeded offline generation ───────────────────
// Used only when the device is offline / signed out. When signed in, the day's
// quests are pulled from the website (Postgres) so both apps show the same set.

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

/** The daily anchors always included in an offline set. */
const OFFLINE_ANCHOR_KEYS = [
  'daily_wake', 'daily_gate', 'daily_dsa', 'daily_deepwork',
  'daily_workout', 'daily_silence', 'daily_rest',
];

/**
 * A varied daily set seeded by the date key ("YYYY-MM-DD"): stable within a day,
 * different each day. Includes the anchors + a weighted-random pick of SIDE
 * missions for flavour. Offline fallback only.
 */
export function generateDailyMissionsSeeded(forDateIso: string, dateKey: string): Mission[] {
  const rng = mulberry32(xmur3(`soloos::${dateKey}`)());
  const byKey = new Map(MISSION_TEMPLATES.map((t) => [t.templateKey, t]));

  const chosen: MissionTemplate[] = [];
  for (const k of OFFLINE_ANCHOR_KEYS) {
    const t = byKey.get(k);
    if (t) chosen.push(t);
  }

  // Randomly add 2–3 non-anchor missions (SIDE or remaining DAILY) for variety.
  const extras = MISSION_TEMPLATES.filter(
    (t) => t.type !== 'RECOVERY' && !OFFLINE_ANCHOR_KEYS.includes(t.templateKey),
  );
  const pickCount = 2 + Math.floor(rng() * 2); // 2 or 3
  const pool = [...extras];
  for (let i = 0; i < pickCount && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]!);
  }

  return chosen.map((t) => instantiateMission(t, forDateIso, { type: t.type }));
}
