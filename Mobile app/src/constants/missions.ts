import type { MissionTemplate, MissionDifficulty } from '@/types';

/**
 * Client-side mirror of the daily/side mission templates (kept in sync with
 * supabase/seed/0100_mission_templates.sql). Used for local-mode play and as
 * the source for daily mission generation.
 */
export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    templateKey: 'daily_wake', title: 'AWAKEN BEFORE THE DAY',
    description: 'Wake before 05:15 and confirm.', type: 'DAILY', difficulty: 'D',
    category: 'DISCIPLINE', activityType: 'WAKE_5AM', objectiveType: 'BOOLEAN',
    targetValue: 1, baseXp: 120, baseCoins: 10,
    attributeRewards: [{ code: 'DIS', xp: 40 }, { code: 'CON', xp: 30 }],
    verificationType: 'MANUAL', failureConsequence: 'Wake streak resets.',
  },
  {
    templateKey: 'daily_gate', title: 'THE GATE OPENS',
    description: 'Complete the assigned GATE study duration.', type: 'DAILY', difficulty: 'C',
    category: 'GATE', activityType: 'GATE_STUDY', objectiveType: 'DURATION_MINUTES',
    targetValue: 90, baseXp: 180, baseCoins: 15,
    attributeRewards: [{ code: 'INT', xp: 60 }, { code: 'FOC', xp: 30 }, { code: 'DIS', xp: 20 }],
    verificationType: 'TIMER', failureConsequence: 'GATE streak resets.',
  },
  {
    templateKey: 'daily_dsa', title: 'ALGORITHM TRAINING',
    description: 'Complete assigned DSA problems.', type: 'DAILY', difficulty: 'C',
    category: 'DSA', activityType: 'DSA', objectiveType: 'COUNT',
    targetValue: 3, baseXp: 150, baseCoins: 15,
    attributeRewards: [{ code: 'INT', xp: 45 }, { code: 'SKL', xp: 45 }, { code: 'FOC', xp: 20 }],
    verificationType: 'PROGRESS_VALUE', failureConsequence: 'DSA streak resets.',
  },
  {
    templateKey: 'daily_deepwork', title: 'ENTER DEEP FOCUS',
    description: 'Complete a deep focus session.', type: 'DAILY', difficulty: 'C',
    category: 'FOCUS', activityType: 'DEEP_WORK', objectiveType: 'DURATION_MINUTES',
    targetValue: 50, baseXp: 140, baseCoins: 12,
    attributeRewards: [{ code: 'FOC', xp: 55 }, { code: 'DIS', xp: 25 }, { code: 'INT', xp: 20 }],
    verificationType: 'TIMER', failureConsequence: 'Deep work streak resets.',
  },
  {
    templateKey: 'daily_workout', title: 'FORGE THE BODY',
    description: "Complete today's workout.", type: 'DAILY', difficulty: 'C',
    category: 'PHYSICAL', activityType: 'WORKOUT', objectiveType: 'BOOLEAN',
    targetValue: 1, baseXp: 160, baseCoins: 15,
    attributeRewards: [{ code: 'STR', xp: 55 }, { code: 'END', xp: 30 }, { code: 'VIT', xp: 25 }],
    verificationType: 'MANUAL', failureConsequence: 'Workout streak resets.',
  },
  {
    templateKey: 'daily_move', title: 'KEEP MOVING',
    description: 'Complete running or walking.', type: 'DAILY', difficulty: 'D',
    category: 'PHYSICAL', activityType: 'RUNNING', objectiveType: 'BOOLEAN',
    targetValue: 1, baseXp: 110, baseCoins: 10,
    attributeRewards: [{ code: 'END', xp: 45 }, { code: 'VIT', xp: 25 }, { code: 'DIS', xp: 15 }],
    verificationType: 'MANUAL', failureConsequence: 'Movement day missed.',
  },
  {
    templateKey: 'daily_silence', title: 'DIGITAL SILENCE',
    description: 'Maintain a Reels and Shorts-free day.', type: 'DAILY', difficulty: 'B',
    category: 'DISCIPLINE', activityType: 'NO_REELS', objectiveType: 'BOOLEAN',
    targetValue: 1, baseXp: 170, baseCoins: 15,
    attributeRewards: [{ code: 'FOC', xp: 50 }, { code: 'DIS', xp: 50 }],
    verificationType: 'MANUAL', failureConsequence: 'Digital silence streak resets.',
  },
  {
    templateKey: 'daily_shadow', title: 'CONTROL THE SHADOW',
    description: 'Maintain control for the day.', type: 'DAILY', difficulty: 'B',
    category: 'RECOVERY', activityType: 'PORN_FREE', objectiveType: 'BOOLEAN',
    targetValue: 1, baseXp: 170, baseCoins: 15,
    attributeRewards: [{ code: 'DIS', xp: 55 }, { code: 'CON', xp: 45 }],
    verificationType: 'MANUAL', failureConsequence: 'Shadow control streak resets.',
  },
  {
    templateKey: 'daily_rest', title: 'REST PROTOCOL',
    description: 'Meet the sleep target.', type: 'DAILY', difficulty: 'D',
    category: 'RECOVERY', activityType: 'ROUTINE_COMPLETION', objectiveType: 'BOOLEAN',
    targetValue: 1, baseXp: 90, baseCoins: 8,
    attributeRewards: [{ code: 'VIT', xp: 40 }, { code: 'CON', xp: 20 }],
    verificationType: 'MANUAL', failureConsequence: 'Recovery reduced.',
  },
  {
    templateKey: 'daily_routine', title: 'ROUTINE LOCK',
    description: 'Complete the core routine blocks.', type: 'DAILY', difficulty: 'B',
    category: 'DISCIPLINE', activityType: 'ROUTINE_COMPLETION', objectiveType: 'BOOLEAN',
    targetValue: 1, baseXp: 150, baseCoins: 14,
    attributeRewards: [{ code: 'CON', xp: 55 }, { code: 'DIS', xp: 35 }],
    verificationType: 'MANUAL', failureConsequence: 'Routine streak resets.',
  },
  {
    templateKey: 'side_aiml', title: 'NEURAL EXPANSION',
    description: 'Study AI / ML for the target duration.', type: 'SIDE', difficulty: 'C',
    category: 'AI_ML', activityType: 'AI_ML', objectiveType: 'DURATION_MINUTES',
    targetValue: 60, baseXp: 130, baseCoins: 12,
    attributeRewards: [{ code: 'INT', xp: 50 }, { code: 'SKL', xp: 40 }],
    verificationType: 'TIMER', failureConsequence: null,
  },
  {
    templateKey: 'side_fullstack', title: 'BUILD PROTOCOL',
    description: 'Full-stack development session.', type: 'SIDE', difficulty: 'C',
    category: 'FULL_STACK', activityType: 'FULL_STACK', objectiveType: 'DURATION_MINUTES',
    targetValue: 60, baseXp: 130, baseCoins: 12,
    attributeRewards: [{ code: 'SKL', xp: 55 }, { code: 'INT', xp: 35 }],
    verificationType: 'TIMER', failureConsequence: null,
  },
  {
    templateKey: 'side_sysdesign', title: 'ARCHITECT MIND',
    description: 'Study System Design.', type: 'SIDE', difficulty: 'C',
    category: 'SYSTEM_DESIGN', activityType: 'SYSTEM_DESIGN', objectiveType: 'DURATION_MINUTES',
    targetValue: 60, baseXp: 130, baseCoins: 12,
    attributeRewards: [{ code: 'INT', xp: 50 }, { code: 'SKL', xp: 40 }],
    verificationType: 'TIMER', failureConsequence: null,
  },
  {
    templateKey: 'side_datasci', title: 'DATA INSIGHT',
    description: 'Data Science study session.', type: 'SIDE', difficulty: 'C',
    category: 'DATA_SCIENCE', activityType: 'DATA_SCIENCE', objectiveType: 'DURATION_MINUTES',
    targetValue: 60, baseXp: 120, baseCoins: 11,
    attributeRewards: [{ code: 'INT', xp: 50 }, { code: 'SKL', xp: 35 }],
    verificationType: 'TIMER', failureConsequence: null,
  },
  {
    templateKey: 'recovery_reclaim', title: 'RECLAIM CONTROL',
    description: 'Execute the recovery protocol.', type: 'RECOVERY', difficulty: 'D',
    category: 'RECOVERY', activityType: 'RECOVERY', objectiveType: 'BOOLEAN',
    targetValue: 1, baseXp: 80, baseCoins: 5,
    attributeRewards: [{ code: 'DIS', xp: 30 }, { code: 'CON', xp: 20 }],
    verificationType: 'MANUAL', failureConsequence: null,
  },
];

export function templateByKey(key: string): MissionTemplate | undefined {
  return MISSION_TEMPLATES.find((t) => t.templateKey === key);
}

/** Difficulty → XP multiplier for reward computation. */
export const DIFFICULTY_MULTIPLIER: Record<MissionDifficulty, number> = {
  E: 0.7, D: 0.85, C: 1.0, B: 1.2, A: 1.45, S: 1.75, SS: 2.2,
};

/** Difficulty display color keys. */
export const DIFFICULTY_ORDER: MissionDifficulty[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];

/** The 6 daily template keys that form the "core" set for perfect-day tracking. */
export const CORE_DAILY_KEYS = [
  'daily_wake', 'daily_gate', 'daily_dsa', 'daily_deepwork', 'daily_workout', 'daily_silence',
];
