/**
 * SOLO OS — Achievement Engine.
 *
 * Evaluates the full achievement catalog against player metrics and returns
 * newly unlocked achievements. Never called from UI components directly.
 *
 * The engine is pure: given a metrics snapshot and the set of already-unlocked
 * keys, it returns the delta of newly unlocked achievements.
 */
import type { AchievementDef } from '@/types';
import { ALL_ACHIEVEMENTS } from '@/constants/achievements';

// ── Metrics snapshot ──────────────────────────────────────────────

/**
 * A flat snapshot of every trackable metric. The game store constructs this
 * from its aggregated data and passes it to `evaluateAchievements`.
 */
export interface PlayerMetrics {
  // levels / XP
  level: number;
  lifetime_xp: number;
  lifetime_coins: number;

  // missions
  missions_completed: number;
  perfect_days: number;
  active_days: number;

  // focus
  focus_sessions: number;
  focus_hours: number;

  // DSA
  dsa_problems: number;

  // workouts
  workouts: number;
  run_distance_km: number;

  // digital
  digital_silence_days: number;

  // GATE
  gate_sessions: number;
  gate_hours: number;
  gate_pyqs: number;

  // streaks
  max_wake_streak: number;
  max_workout_streak: number;
  max_dsa_streak: number;
  max_routine_streak: number;
  max_any_streak: number;

  // recovery
  recoveries_completed: number;
  urges_resisted: number;

  // bosses
  bosses_defeated: number;
  total_boss_damage: number;

  // study
  total_study_hours: number;
  deep_work_days: number;
  aiml_hours: number;
  fullstack_hours: number;
  sysdesign_hours: number;
  datasci_hours: number;

  // economy
  coins_spent: number;
  rewards_purchased: number;
  campaign_stages_mastered: number;

  // shadow
  shadow_control_days: number;
  wake_success_days: number;

  // allow arbitrary metric keys for future extensibility
  [key: string]: number;
}

// ── Evaluation ────────────────────────────────────────────────────

export interface AchievementUnlock {
  achievement: AchievementDef;
  unlockedAt: string;
}

/**
 * Evaluate all achievements. Returns only the NEWLY unlocked ones.
 * @param metrics - Current player metrics snapshot.
 * @param alreadyUnlocked - Set of achievement keys already earned.
 */
export function evaluateAchievements(
  metrics: PlayerMetrics,
  alreadyUnlocked: Set<string>,
): AchievementUnlock[] {
  const now = new Date().toISOString();
  const newly: AchievementUnlock[] = [];

  for (const def of ALL_ACHIEVEMENTS) {
    if (alreadyUnlocked.has(def.key)) continue;

    const value = metrics[def.metric];
    if (typeof value !== 'number') continue;

    if (value >= def.threshold) {
      newly.push({ achievement: def, unlockedAt: now });
    }
  }

  return newly;
}

/**
 * Build an initial (empty) metrics snapshot with zeroes.
 */
export function createInitialMetrics(): PlayerMetrics {
  return {
    level: 1,
    lifetime_xp: 0,
    lifetime_coins: 0,
    missions_completed: 0,
    perfect_days: 0,
    active_days: 0,
    focus_sessions: 0,
    focus_hours: 0,
    dsa_problems: 0,
    workouts: 0,
    run_distance_km: 0,
    digital_silence_days: 0,
    gate_sessions: 0,
    gate_hours: 0,
    gate_pyqs: 0,
    max_wake_streak: 0,
    max_workout_streak: 0,
    max_dsa_streak: 0,
    max_routine_streak: 0,
    max_any_streak: 0,
    recoveries_completed: 0,
    urges_resisted: 0,
    bosses_defeated: 0,
    total_boss_damage: 0,
    total_study_hours: 0,
    deep_work_days: 0,
    aiml_hours: 0,
    fullstack_hours: 0,
    sysdesign_hours: 0,
    datasci_hours: 0,
    coins_spent: 0,
    rewards_purchased: 0,
    campaign_stages_mastered: 0,
    shadow_control_days: 0,
    wake_success_days: 0,
  };
}

/**
 * Build a metrics snapshot from game state data.
 * This bridges the store's raw data into the flat metrics the engine expects.
 */
export function buildMetricsFromState(data: {
  level: number;
  lifetimeXp: number;
  coins: number;
  missionsCompleted: number;
  focusSessions: number;
  focusHours: number;
  dsaProblems: number;
  workouts: number;
  activeDays: number;
  perfectDays: number;
  bossesDefeated: number;
  totalBossDamage: number;
  recoveriesCompleted: number;
  urgesResisted: number;
  maxStreaks: Record<string, number>;
  studyHours: number;
  deepWorkDays: number;
  digitalSilenceDays: number;
  shadowControlDays: number;
  wakeSuccessDays: number;
  gateHours: number;
  gateSessions: number;
  gatePyqs: number;
  aimlHours: number;
  fullstackHours: number;
  sysdesignHours: number;
  datasciHours: number;
  coinsSpent: number;
  rewardsPurchased: number;
  campaignStagesMastered: number;
  runDistanceKm: number;
}): PlayerMetrics {
  return {
    level: data.level,
    lifetime_xp: data.lifetimeXp,
    lifetime_coins: data.coins,
    missions_completed: data.missionsCompleted,
    perfect_days: data.perfectDays,
    active_days: data.activeDays,
    focus_sessions: data.focusSessions,
    focus_hours: data.focusHours,
    dsa_problems: data.dsaProblems,
    workouts: data.workouts,
    run_distance_km: data.runDistanceKm,
    digital_silence_days: data.digitalSilenceDays,
    gate_sessions: data.gateSessions,
    gate_hours: data.gateHours,
    gate_pyqs: data.gatePyqs,
    max_wake_streak: data.maxStreaks['WAKE'] ?? 0,
    max_workout_streak: data.maxStreaks['WORKOUT'] ?? 0,
    max_dsa_streak: data.maxStreaks['DSA'] ?? 0,
    max_routine_streak: data.maxStreaks['ROUTINE'] ?? 0,
    max_any_streak: Math.max(...Object.values(data.maxStreaks), 0),
    recoveries_completed: data.recoveriesCompleted,
    urges_resisted: data.urgesResisted,
    bosses_defeated: data.bossesDefeated,
    total_boss_damage: data.totalBossDamage,
    total_study_hours: data.studyHours,
    deep_work_days: data.deepWorkDays,
    aiml_hours: data.aimlHours,
    fullstack_hours: data.fullstackHours,
    sysdesign_hours: data.sysdesignHours,
    datasci_hours: data.datasciHours,
    coins_spent: data.coinsSpent,
    rewards_purchased: data.rewardsPurchased,
    campaign_stages_mastered: data.campaignStagesMastered,
    shadow_control_days: data.shadowControlDays,
    wake_success_days: data.wakeSuccessDays,
  };
}
