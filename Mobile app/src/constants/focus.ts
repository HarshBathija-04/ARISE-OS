import type { FocusCategory, ActivityType, AttributeCode } from '@/types';
import { colors } from '@/theme';

export interface FocusCategoryDef {
  code: FocusCategory;
  name: string;
  activity: ActivityType;
  color: string;
  attributes: AttributeCode[];
}

export const FOCUS_CATEGORIES: FocusCategoryDef[] = [
  { code: 'GATE', name: 'GATE', activity: 'GATE_STUDY', color: colors.energy, attributes: ['INT', 'FOC', 'DIS'] },
  { code: 'DSA', name: 'DSA', activity: 'DSA', color: colors.gold, attributes: ['INT', 'SKL', 'FOC'] },
  { code: 'AI_ML', name: 'AI / ML', activity: 'AI_ML', color: colors.violet, attributes: ['INT', 'SKL'] },
  { code: 'FULL_STACK', name: 'FULL STACK', activity: 'FULL_STACK', color: colors.cyan, attributes: ['SKL', 'INT'] },
  { code: 'DATA_SCIENCE', name: 'DATA SCIENCE', activity: 'DATA_SCIENCE', color: colors.energyBright, attributes: ['INT', 'SKL'] },
  { code: 'SYSTEM_DESIGN', name: 'SYSTEM DESIGN', activity: 'SYSTEM_DESIGN', color: colors.violetBright, attributes: ['INT', 'SKL'] },
  { code: 'PROJECT_WORK', name: 'PROJECT WORK', activity: 'DEEP_WORK', color: colors.green, attributes: ['FOC', 'SKL', 'DIS'] },
];

export function focusCategoryDef(code: FocusCategory): FocusCategoryDef {
  return FOCUS_CATEGORIES.find((c) => c.code === code) ?? FOCUS_CATEGORIES[0];
}

/** Preset durations in minutes. CUSTOM handled separately. */
export const FOCUS_PRESETS = [25, 50, 90] as const;
