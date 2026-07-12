import type { AttributeCode, AttributeDef, ActivityType } from '@/types';
import { colors } from '@/theme';

export const ATTRIBUTE_DEFS: AttributeDef[] = [
  { code: 'STR', name: 'STRENGTH', description: 'Physical power from training.', color: colors.crimson },
  { code: 'INT', name: 'INTELLIGENCE', description: 'Knowledge and reasoning.', color: colors.energy },
  { code: 'FOC', name: 'FOCUS', description: 'Sustained attention and deep work.', color: colors.cyan },
  { code: 'DIS', name: 'DISCIPLINE', description: 'Control over impulses and routine.', color: colors.violet },
  { code: 'END', name: 'ENDURANCE', description: 'Stamina and cardiovascular fitness.', color: colors.green },
  { code: 'CON', name: 'CONSISTENCY', description: 'Showing up, day after day.', color: colors.gold },
  { code: 'SKL', name: 'TECHNICAL SKILL', description: 'Applied engineering ability.', color: colors.energyBright },
  { code: 'VIT', name: 'VITALITY', description: 'Health, recovery, and energy.', color: colors.violetBright },
];

export const ATTRIBUTE_CODES: AttributeCode[] = ATTRIBUTE_DEFS.map((a) => a.code);

export function attributeDef(code: AttributeCode): AttributeDef {
  return ATTRIBUTE_DEFS.find((a) => a.code === code) ?? ATTRIBUTE_DEFS[0];
}

/**
 * Activity → attribute distribution (weights). From the spec's activity map.
 * Weights are relative shares of an activity's attribute XP pool.
 */
export const ACTIVITY_ATTRIBUTE_MAP: Record<ActivityType, Partial<Record<AttributeCode, number>>> = {
  WORKOUT: { STR: 3, END: 1, VIT: 1 },
  RUNNING: { END: 3, VIT: 1, DIS: 1 },
  GATE_STUDY: { INT: 3, FOC: 1, DIS: 1 },
  DSA: { INT: 2, SKL: 2, FOC: 1 },
  AI_ML: { INT: 2, SKL: 2 },
  FULL_STACK: { SKL: 3, INT: 1 },
  SYSTEM_DESIGN: { INT: 2, SKL: 2 },
  DATA_SCIENCE: { INT: 2, SKL: 1 },
  WAKE_5AM: { DIS: 2, CON: 1 },
  DEEP_WORK: { FOC: 3, DIS: 1, INT: 1 },
  NO_REELS: { FOC: 2, DIS: 2 },
  PORN_FREE: { DIS: 2, CON: 1 },
  ROUTINE_COMPLETION: { CON: 2, DIS: 1 },
  RECOVERY: { DIS: 1, CON: 1 },
  FOCUS_SESSION: { FOC: 3, DIS: 1 },
  CUSTOM: { CON: 1 },
};
