import type { SystemEventType } from '@/types';
import { colors } from '@/theme';

export const SYSTEM_EVENT_META: Record<SystemEventType, { color: string; label: string }> = {
  MISSION_COMPLETE: { color: colors.cyan, label: 'MISSION' },
  LEVEL_UP: { color: colors.gold, label: 'LEVEL' },
  ACHIEVEMENT: { color: colors.violetBright, label: 'ACHIEVEMENT' },
  BOSS_DAMAGE: { color: colors.crimson, label: 'BOSS' },
  BOSS_DEFEAT: { color: colors.crimson, label: 'BOSS' },
  STREAK_MILESTONE: { color: colors.energy, label: 'STREAK' },
  RECOVERY: { color: colors.green, label: 'RECOVERY' },
  FOCUS_COMPLETE: { color: colors.cyan, label: 'FOCUS' },
  REWARD: { color: colors.gold, label: 'REWARD' },
  SYSTEM: { color: colors.energy, label: 'SYSTEM' },
};
