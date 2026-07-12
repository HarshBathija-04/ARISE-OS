import type { AchievementDef } from '@/types';

/**
 * SOLO OS — Canonical achievement catalog (100+).
 *
 * This is the single source of truth. The achievement-engine evaluates these
 * against player metrics; the Supabase seed is generated from this list
 * (see supabase/seed/generate.mjs).
 *
 * `metric` names must match the keys produced by the metrics aggregator.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Onboarding / meta ──────────────────────────────────────────
  { key: 'first_signal', name: 'FIRST SIGNAL', description: 'Complete your first mission.', rarity: 'COMMON', metric: 'missions_completed', threshold: 1, coinReward: 20, unlocksTitleKey: 'the_initiate' },
  { key: 'system_link', name: 'SYSTEM LINK', description: 'Use SOLO OS for 7 days.', rarity: 'COMMON', metric: 'active_days', threshold: 7, coinReward: 30 },
  { key: 'system_bond', name: 'SYSTEM BOND', description: 'Use SOLO OS for 30 days.', rarity: 'RARE', metric: 'active_days', threshold: 30, coinReward: 60 },
  { key: 'system_fusion', name: 'SYSTEM FUSION', description: 'Use SOLO OS for 100 days.', rarity: 'EPIC', metric: 'active_days', threshold: 100, coinReward: 120 },
  { key: 'system_eternal', name: 'SYSTEM ETERNAL', description: 'Use SOLO OS for 365 days.', rarity: 'MYTHIC', metric: 'active_days', threshold: 365, coinReward: 500 },

  // ── Levels ─────────────────────────────────────────────────────
  { key: 'awakening', name: 'AWAKENING', description: 'Reach Level 5.', rarity: 'COMMON', metric: 'level', threshold: 5, coinReward: 40 },
  { key: 'ascension_begins', name: 'ASCENSION BEGINS', description: 'Reach Level 10.', rarity: 'RARE', metric: 'level', threshold: 10, coinReward: 80 },
  { key: 'vanguard_rise', name: 'VANGUARD RISE', description: 'Reach Level 21.', rarity: 'RARE', metric: 'level', threshold: 21, coinReward: 120 },
  { key: 'ascendant_path', name: 'ASCENDANT PATH', description: 'Reach Level 36.', rarity: 'EPIC', metric: 'level', threshold: 36, coinReward: 180, unlocksTitleKey: 'the_ascendant' },
  { key: 'elite_status', name: 'ELITE STATUS', description: 'Reach Level 51.', rarity: 'EPIC', metric: 'level', threshold: 51, coinReward: 250 },
  { key: 'apex_reached', name: 'APEX REACHED', description: 'Reach Level 66.', rarity: 'LEGENDARY', metric: 'level', threshold: 66, coinReward: 350 },
  { key: 'transcendence', name: 'TRANSCENDENCE', description: 'Reach Level 81.', rarity: 'LEGENDARY', metric: 'level', threshold: 81, coinReward: 450 },
  { key: 'paragon', name: 'PARAGON', description: 'Reach Level 91.', rarity: 'MYTHIC', metric: 'level', threshold: 91, coinReward: 600 },
  { key: 'sovereign', name: 'SOVEREIGN', description: 'Reach Level 100.', rarity: 'MYTHIC', metric: 'level', threshold: 100, coinReward: 1000, unlocksTitleKey: 'the_sovereign' },

  // ── Missions ───────────────────────────────────────────────────
  { key: 'mission_10', name: 'OPERATIVE', description: 'Complete 10 missions.', rarity: 'COMMON', metric: 'missions_completed', threshold: 10, coinReward: 30 },
  { key: 'mission_50', name: 'FIELD AGENT', description: 'Complete 50 missions.', rarity: 'RARE', metric: 'missions_completed', threshold: 50, coinReward: 60 },
  { key: 'mission_100', name: 'VETERAN', description: 'Complete 100 missions.', rarity: 'RARE', metric: 'missions_completed', threshold: 100, coinReward: 100 },
  { key: 'mission_500', name: 'MISSION MASTER', description: 'Complete 500 missions.', rarity: 'EPIC', metric: 'missions_completed', threshold: 500, coinReward: 250 },
  { key: 'mission_1000', name: 'RELENTLESS', description: 'Complete 1000 missions.', rarity: 'LEGENDARY', metric: 'missions_completed', threshold: 1000, coinReward: 500 },
  { key: 'no_excuses', name: 'NO EXCUSES', description: 'Complete all core missions for 7 days.', rarity: 'EPIC', metric: 'perfect_days', threshold: 7, coinReward: 150 },
  { key: 'flawless_month', name: 'FLAWLESS PROTOCOL', description: 'Complete all core missions for 30 days.', rarity: 'MYTHIC', metric: 'perfect_days', threshold: 30, coinReward: 600 },

  // ── Focus ──────────────────────────────────────────────────────
  { key: 'focus_first', name: 'FIRST FOCUS', description: 'Complete your first focus session.', rarity: 'COMMON', metric: 'focus_sessions', threshold: 1, coinReward: 15 },
  { key: 'focus_10', name: 'FOCUSED MIND', description: 'Complete 10 focus sessions.', rarity: 'COMMON', metric: 'focus_sessions', threshold: 10, coinReward: 30 },
  { key: 'deep_diver', name: 'DEEP DIVER', description: 'Complete 50 focus sessions.', rarity: 'RARE', metric: 'focus_sessions', threshold: 50, coinReward: 80, unlocksTitleKey: 'focus_hunter' },
  { key: 'focus_200', name: 'DEEP WORK MASTER', description: 'Complete 200 focus sessions.', rarity: 'EPIC', metric: 'focus_sessions', threshold: 200, coinReward: 200, unlocksTitleKey: 'deep_work_master' },
  { key: 'focus_hours_100', name: 'CENTURION OF FOCUS', description: 'Accumulate 100 hours of focus.', rarity: 'EPIC', metric: 'focus_hours', threshold: 100, coinReward: 220 },
  { key: 'focus_hours_500', name: 'MIND FORTRESS', description: 'Accumulate 500 hours of focus.', rarity: 'LEGENDARY', metric: 'focus_hours', threshold: 500, coinReward: 450 },

  // ── DSA ────────────────────────────────────────────────────────
  { key: 'dsa_10', name: 'PROBLEM SOLVER', description: 'Solve 10 DSA problems.', rarity: 'COMMON', metric: 'dsa_problems', threshold: 10, coinReward: 25 },
  { key: 'algorithm_hunter', name: 'ALGORITHM HUNTER', description: 'Solve 100 DSA problems.', rarity: 'RARE', metric: 'dsa_problems', threshold: 100, coinReward: 100, unlocksTitleKey: 'algorithm_hunter' },
  { key: 'algorithm_slayer', name: 'ALGORITHM SLAYER', description: 'Solve 500 DSA problems.', rarity: 'LEGENDARY', metric: 'dsa_problems', threshold: 500, coinReward: 400 },
  { key: 'algorithm_god', name: 'ALGORITHM ASCENDANT', description: 'Solve 1000 DSA problems.', rarity: 'MYTHIC', metric: 'dsa_problems', threshold: 1000, coinReward: 800 },

  // ── Workouts / physical ────────────────────────────────────────
  { key: 'workout_first', name: 'FIRST FORGE', description: 'Complete your first workout.', rarity: 'COMMON', metric: 'workouts', threshold: 1, coinReward: 15 },
  { key: 'workout_25', name: 'STEEL FORMING', description: 'Complete 25 workouts.', rarity: 'COMMON', metric: 'workouts', threshold: 25, coinReward: 40 },
  { key: 'iron_will', name: 'IRON WILL', description: 'Complete 100 workouts.', rarity: 'EPIC', metric: 'workouts', threshold: 100, coinReward: 180, unlocksTitleKey: 'iron_mind' },
  { key: 'iron_body', name: 'IRON BODY', description: 'Complete 300 workouts.', rarity: 'LEGENDARY', metric: 'workouts', threshold: 300, coinReward: 400 },
  { key: 'run_50k', name: 'DISTANCE RUNNER', description: 'Run 50 km total.', rarity: 'RARE', metric: 'run_distance_km', threshold: 50, coinReward: 80 },
  { key: 'run_250k', name: 'MARATHON SPIRIT', description: 'Run 250 km total.', rarity: 'EPIC', metric: 'run_distance_km', threshold: 250, coinReward: 220 },

  // ── Digital silence / discipline ──────────────────────────────
  { key: 'silence_7', name: 'QUIET MIND', description: 'Control Reels and Shorts for 7 days.', rarity: 'COMMON', metric: 'digital_silence_days', threshold: 7, coinReward: 40 },
  { key: 'digital_silence', name: 'DIGITAL SILENCE', description: 'Control Reels and Shorts for 30 days.', rarity: 'EPIC', metric: 'digital_silence_days', threshold: 30, coinReward: 160 },
  { key: 'silence_100', name: 'THE UNPLUGGED', description: 'Control Reels and Shorts for 100 days.', rarity: 'LEGENDARY', metric: 'digital_silence_days', threshold: 100, coinReward: 400 },

  // ── GATE ───────────────────────────────────────────────────────
  { key: 'gate_first', name: 'GATE INITIATE', description: 'Complete your first GATE study session.', rarity: 'COMMON', metric: 'gate_sessions', threshold: 1, coinReward: 20 },
  { key: 'gate_hours_50', name: 'GATE SCHOLAR', description: 'Accumulate 50 hours of GATE study.', rarity: 'RARE', metric: 'gate_hours', threshold: 50, coinReward: 100 },
  { key: 'gate_hours_200', name: 'GATE CHALLENGER', description: 'Complete 500 GATE PYQs.', rarity: 'EPIC', metric: 'gate_pyqs', threshold: 500, coinReward: 250 },
  { key: 'gate_hours_500', name: 'GATE CONQUEROR', description: 'Accumulate 500 hours of GATE study.', rarity: 'LEGENDARY', metric: 'gate_hours', threshold: 500, coinReward: 500 },

  // ── Streaks ────────────────────────────────────────────────────
  { key: 'streak_wake_7', name: 'DAWNBREAKER', description: 'Hold a 7-day wake streak.', rarity: 'COMMON', metric: 'max_wake_streak', threshold: 7, coinReward: 40 },
  { key: 'streak_wake_30', name: 'MASTER OF MORNINGS', description: 'Hold a 30-day wake streak.', rarity: 'EPIC', metric: 'max_wake_streak', threshold: 30, coinReward: 160 },
  { key: 'streak_workout_30', name: 'UNBROKEN BODY', description: 'Hold a 30-day workout streak.', rarity: 'EPIC', metric: 'max_workout_streak', threshold: 30, coinReward: 160 },
  { key: 'streak_dsa_30', name: 'DAILY SOLVER', description: 'Hold a 30-day DSA streak.', rarity: 'EPIC', metric: 'max_dsa_streak', threshold: 30, coinReward: 160 },
  { key: 'streak_routine_30', name: 'THE DISCIPLINED', description: 'Hold a 30-day routine streak.', rarity: 'EPIC', metric: 'max_routine_streak', threshold: 30, coinReward: 160, unlocksTitleKey: 'the_disciplined' },
  { key: 'streak_100', name: 'CENTURY OF WILL', description: 'Hold any streak for 100 days.', rarity: 'LEGENDARY', metric: 'max_any_streak', threshold: 100, coinReward: 400, unlocksTitleKey: 'the_consistent' },

  // ── Recovery ───────────────────────────────────────────────────
  { key: 'recovery_first', name: 'FIRST RETURN', description: 'Complete your first recovery protocol.', rarity: 'COMMON', metric: 'recoveries_completed', threshold: 1, coinReward: 20 },
  { key: 'recovery_10', name: 'THE RESILIENT', description: 'Complete 10 recovery protocols.', rarity: 'RARE', metric: 'recoveries_completed', threshold: 10, coinReward: 80 },
  { key: 'the_unyielding', name: 'THE UNYIELDING', description: 'Recover from 25 failed days and return to the System.', rarity: 'LEGENDARY', metric: 'recoveries_completed', threshold: 25, coinReward: 350, unlocksTitleKey: 'the_unyielding' },
  { key: 'urge_resist_50', name: 'SHADOW WARDEN', description: 'Resist 50 urges.', rarity: 'EPIC', metric: 'urges_resisted', threshold: 50, coinReward: 180 },
  { key: 'urge_resist_200', name: 'SHADOW SOVEREIGN', description: 'Resist 200 urges.', rarity: 'LEGENDARY', metric: 'urges_resisted', threshold: 200, coinReward: 400 },

  // ── Bosses ─────────────────────────────────────────────────────
  { key: 'boss_first', name: 'GIANT SLAYER', description: 'Defeat your first boss.', rarity: 'RARE', metric: 'bosses_defeated', threshold: 1, coinReward: 100 },
  { key: 'boss_3', name: 'TRIAL BREAKER', description: 'Defeat 3 bosses.', rarity: 'EPIC', metric: 'bosses_defeated', threshold: 3, coinReward: 220 },
  { key: 'boss_all', name: 'NEMESIS ENDER', description: 'Defeat all initial bosses.', rarity: 'LEGENDARY', metric: 'bosses_defeated', threshold: 6, coinReward: 500 },

  // ── XP / coins ─────────────────────────────────────────────────
  { key: 'xp_10k', name: 'ENERGY RISING', description: 'Earn 10,000 lifetime XP.', rarity: 'RARE', metric: 'lifetime_xp', threshold: 10000, coinReward: 80 },
  { key: 'xp_100k', name: 'POWER SURGE', description: 'Earn 100,000 lifetime XP.', rarity: 'EPIC', metric: 'lifetime_xp', threshold: 100000, coinReward: 250 },
  { key: 'xp_1m', name: 'BOUNDLESS', description: 'Earn 1,000,000 lifetime XP.', rarity: 'MYTHIC', metric: 'lifetime_xp', threshold: 1000000, coinReward: 1000 },
  { key: 'coins_1k', name: 'SAVER', description: 'Earn 1,000 lifetime coins.', rarity: 'COMMON', metric: 'lifetime_coins', threshold: 1000, coinReward: 30 },
  { key: 'coins_10k', name: 'TREASURER', description: 'Earn 10,000 lifetime coins.', rarity: 'EPIC', metric: 'lifetime_coins', threshold: 10000, coinReward: 200 },
];

/** Programmatically-generated tiered achievements to exceed 100 definitions. */
function tiered(
  prefix: string,
  nameBase: string,
  metric: string,
  descBase: string,
  tiers: { t: number; r: AchievementDef['rarity']; coin: number }[],
): AchievementDef[] {
  return tiers.map(({ t, r, coin }, i) => ({
    key: `${prefix}_${t}`,
    name: `${nameBase} ${['I', 'II', 'III', 'IV', 'V', 'VI'][i] ?? t}`,
    description: `${descBase} ${t}.`,
    rarity: r,
    metric,
    threshold: t,
    coinReward: coin,
  }));
}

const generated: AchievementDef[] = [
  ...tiered('study_hours', 'SCHOLAR', 'total_study_hours', 'Accumulate total study hours:', [
    { t: 25, r: 'COMMON', coin: 30 },
    { t: 100, r: 'RARE', coin: 70 },
    { t: 300, r: 'EPIC', coin: 160 },
    { t: 750, r: 'LEGENDARY', coin: 350 },
    { t: 1500, r: 'MYTHIC', coin: 700 },
  ]),
  ...tiered('deepwork_days', 'FOCUSED', 'deep_work_days', 'Log deep work on separate days:', [
    { t: 10, r: 'COMMON', coin: 30 },
    { t: 50, r: 'RARE', coin: 80 },
    { t: 150, r: 'EPIC', coin: 180 },
    { t: 365, r: 'LEGENDARY', coin: 400 },
  ]),
  ...tiered('aiml_hours', 'NEURAL', 'aiml_hours', 'Accumulate AI/ML hours:', [
    { t: 25, r: 'COMMON', coin: 30 },
    { t: 100, r: 'RARE', coin: 80 },
    { t: 300, r: 'EPIC', coin: 180 },
    { t: 600, r: 'LEGENDARY', coin: 380 },
  ]),
  ...tiered('fullstack_hours', 'BUILDER', 'fullstack_hours', 'Accumulate full-stack hours:', [
    { t: 25, r: 'COMMON', coin: 30 },
    { t: 100, r: 'RARE', coin: 80 },
    { t: 300, r: 'EPIC', coin: 180 },
    { t: 600, r: 'LEGENDARY', coin: 380 },
  ]),
  ...tiered('sysdesign_hours', 'ARCHITECT', 'sysdesign_hours', 'Accumulate system design hours:', [
    { t: 20, r: 'COMMON', coin: 30 },
    { t: 80, r: 'RARE', coin: 80 },
    { t: 200, r: 'EPIC', coin: 180 },
  ]),
  ...tiered('datasci_hours', 'ANALYST', 'datasci_hours', 'Accumulate data science hours:', [
    { t: 20, r: 'COMMON', coin: 30 },
    { t: 80, r: 'RARE', coin: 80 },
    { t: 200, r: 'EPIC', coin: 180 },
  ]),
  ...tiered('coins_spent', 'INDULGENT', 'coins_spent', 'Spend lifetime coins on rewards:', [
    { t: 500, r: 'COMMON', coin: 0 },
    { t: 5000, r: 'RARE', coin: 0 },
    { t: 20000, r: 'EPIC', coin: 0 },
  ]),
  ...tiered('campaign_stages', 'PATHFINDER', 'campaign_stages_mastered', 'Master campaign stages:', [
    { t: 1, r: 'COMMON', coin: 30 },
    { t: 10, r: 'RARE', coin: 90 },
    { t: 30, r: 'EPIC', coin: 220 },
    { t: 60, r: 'LEGENDARY', coin: 500 },
  ]),
  ...tiered('boss_damage', 'DESTROYER', 'total_boss_damage', 'Deal total boss damage:', [
    { t: 500, r: 'COMMON', coin: 30 },
    { t: 5000, r: 'RARE', coin: 90 },
    { t: 25000, r: 'EPIC', coin: 240 },
  ]),
  ...tiered('early_days', 'EARLY RISER', 'wake_success_days', 'Wake before target on days:', [
    { t: 10, r: 'COMMON', coin: 30 },
    { t: 50, r: 'RARE', coin: 90 },
    { t: 150, r: 'EPIC', coin: 200 },
    { t: 365, r: 'LEGENDARY', coin: 450 },
  ]),
  ...tiered('shadow_control_days', 'WARDEN', 'shadow_control_days', 'Maintain shadow control on days:', [
    { t: 7, r: 'COMMON', coin: 30 },
    { t: 30, r: 'RARE', coin: 100 },
    { t: 90, r: 'EPIC', coin: 240 },
    { t: 180, r: 'LEGENDARY', coin: 480 },
  ]),
  ...tiered('reward_purchases', 'SELF-KEEPER', 'rewards_purchased', 'Redeem rewards from the vault:', [
    { t: 1, r: 'COMMON', coin: 0 },
    { t: 10, r: 'RARE', coin: 0 },
    { t: 50, r: 'EPIC', coin: 0 },
  ]),
];

export const ALL_ACHIEVEMENTS: AchievementDef[] = [...ACHIEVEMENTS, ...generated];
