/**
 * SOLO OS — Timetable constants.
 *
 * Defines the daily schedule structure, block states, category mappings,
 * XP rewards, and default timetable for the user.
 */
import { colors, withAlpha } from '@/theme';

// ── Block States ──────────────────────────────────────────────────
export type TimetableBlockState =
  | 'UPCOMING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'MISSED'
  | 'SKIPPED'
  | 'PAUSED'
  | 'LATE'
  | 'FINISHED_EARLY';

export interface BlockStateStyle {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string; // lucide icon name
  label: string;
}

export const BLOCK_STATE_STYLES: Record<TimetableBlockState, BlockStateStyle> = {
  UPCOMING: {
    color: colors.textDim,
    bgColor: colors.surface,
    borderColor: colors.border,
    icon: 'Clock',
    label: 'UPCOMING',
  },
  ACTIVE: {
    color: colors.cyan,
    bgColor: withAlpha(colors.cyan, 0.08),
    borderColor: withAlpha(colors.cyan, 0.5),
    icon: 'Play',
    label: 'ACTIVE',
  },
  COMPLETED: {
    color: colors.green,
    bgColor: withAlpha(colors.green, 0.08),
    borderColor: withAlpha(colors.green, 0.4),
    icon: 'CheckCircle2',
    label: 'COMPLETED',
  },
  MISSED: {
    color: colors.crimson,
    bgColor: withAlpha(colors.crimson, 0.08),
    borderColor: withAlpha(colors.crimson, 0.4),
    icon: 'XCircle',
    label: 'MISSED',
  },
  SKIPPED: {
    color: colors.textSecondary,
    bgColor: withAlpha(colors.textSecondary, 0.06),
    borderColor: withAlpha(colors.textSecondary, 0.3),
    icon: 'SkipForward',
    label: 'SKIPPED',
  },
  PAUSED: {
    color: colors.gold,
    bgColor: withAlpha(colors.gold, 0.08),
    borderColor: withAlpha(colors.gold, 0.4),
    icon: 'Pause',
    label: 'PAUSED',
  },
  LATE: {
    color: colors.crimson,
    bgColor: withAlpha(colors.crimson, 0.06),
    borderColor: withAlpha(colors.crimson, 0.3),
    icon: 'AlertTriangle',
    label: 'LATE',
  },
  FINISHED_EARLY: {
    color: colors.energyBright,
    bgColor: withAlpha(colors.energyBright, 0.08),
    borderColor: withAlpha(colors.energyBright, 0.4),
    icon: 'Zap',
    label: 'FINISHED EARLY',
  },
};

// ── Category ──────────────────────────────────────────────────────
export type TimetableCategory =
  | 'STUDY'
  | 'EXERCISE'
  | 'MORNING_ROUTINE'
  | 'BATH'
  | 'BREAKFAST'
  | 'LUNCH'
  | 'DINNER'
  | 'GAMING'
  | 'BREAK'
  | 'SLEEP';

export interface CategoryDef {
  code: TimetableCategory;
  label: string;
  color: string;
  missionLink: string;
  focusCategory: string | null; // maps to FocusCategory for focus mode
}

export const CATEGORY_DEFS: CategoryDef[] = [
  { code: 'STUDY', label: 'Study', color: colors.energy, missionLink: "Today's GATE Mission", focusCategory: 'GATE' },
  { code: 'EXERCISE', label: 'Exercise', color: colors.green, missionLink: 'Workout Mission', focusCategory: null },
  { code: 'MORNING_ROUTINE', label: 'Morning Routine', color: colors.violet, missionLink: 'Daily Routine', focusCategory: null },
  { code: 'BATH', label: 'Bath', color: colors.cyanBright, missionLink: 'Daily Routine', focusCategory: null },
  { code: 'BREAKFAST', label: 'Breakfast', color: colors.gold, missionLink: 'Health', focusCategory: null },
  { code: 'LUNCH', label: 'Lunch', color: colors.gold, missionLink: 'Health', focusCategory: null },
  { code: 'DINNER', label: 'Dinner', color: colors.gold, missionLink: 'Nutrition', focusCategory: null },
  { code: 'GAMING', label: 'Gaming', color: colors.violetBright, missionLink: 'Recreation', focusCategory: null },
  { code: 'BREAK', label: 'Break', color: colors.textSecondary, missionLink: 'Recovery', focusCategory: null },
  { code: 'SLEEP', label: 'Sleep', color: colors.textDim, missionLink: 'Recovery', focusCategory: null },
];

export function categoryDef(code: TimetableCategory): CategoryDef {
  return CATEGORY_DEFS.find((c) => c.code === code) ?? CATEGORY_DEFS[0];
}

// ── Timetable Block ──────────────────────────────────────────────
export interface TimetableBlock {
  id: string;
  startHour: number;  // 0-23
  startMin: number;   // 0-59
  endHour: number;
  endMin: number;
  activity: string;
  category: TimetableCategory;
  xpReward: number;
}

// ── XP Rewards ──────────────────────────────────────────────────
export const TIMETABLE_XP: Record<TimetableCategory, number> = {
  MORNING_ROUTINE: 20,
  EXERCISE: 80,
  STUDY: 120,
  BATH: 10,
  BREAKFAST: 15,
  LUNCH: 20,
  DINNER: 20,
  GAMING: 15,
  BREAK: 5,
  SLEEP: 0,
};

// ── Default Daily Schedule ──────────────────────────────────────
export const DEFAULT_TIMETABLE: TimetableBlock[] = [
  { id: 'tt-01', startHour: 5, startMin: 0, endHour: 5, endMin: 15, activity: 'Morning Routine', category: 'MORNING_ROUTINE', xpReward: 20 },
  { id: 'tt-02', startHour: 5, startMin: 15, endHour: 6, endMin: 15, activity: 'Exercise', category: 'EXERCISE', xpReward: 80 },
  { id: 'tt-03', startHour: 6, startMin: 15, endHour: 6, endMin: 30, activity: 'Bath', category: 'BATH', xpReward: 10 },
  { id: 'tt-04', startHour: 6, startMin: 30, endHour: 8, endMin: 0, activity: 'Study Session 1', category: 'STUDY', xpReward: 120 },
  { id: 'tt-05', startHour: 8, startMin: 0, endHour: 9, endMin: 0, activity: 'Breakfast', category: 'BREAKFAST', xpReward: 15 },
  { id: 'tt-06', startHour: 9, startMin: 0, endHour: 11, endMin: 0, activity: 'Study Session 2', category: 'STUDY', xpReward: 120 },
  { id: 'tt-07', startHour: 11, startMin: 0, endHour: 11, endMin: 30, activity: 'Break', category: 'BREAK', xpReward: 5 },
  { id: 'tt-08', startHour: 11, startMin: 30, endHour: 14, endMin: 0, activity: 'Study Session 3', category: 'STUDY', xpReward: 120 },
  { id: 'tt-09', startHour: 14, startMin: 0, endHour: 15, endMin: 0, activity: 'Lunch', category: 'LUNCH', xpReward: 20 },
  { id: 'tt-10', startHour: 15, startMin: 0, endHour: 17, endMin: 0, activity: 'Study Session 4', category: 'STUDY', xpReward: 120 },
  { id: 'tt-11', startHour: 17, startMin: 0, endHour: 19, endMin: 0, activity: 'Gaming', category: 'GAMING', xpReward: 15 },
  { id: 'tt-12', startHour: 19, startMin: 0, endHour: 20, endMin: 0, activity: 'Break', category: 'BREAK', xpReward: 5 },
  { id: 'tt-13', startHour: 20, startMin: 0, endHour: 21, endMin: 0, activity: 'Dinner', category: 'DINNER', xpReward: 20 },
  { id: 'tt-14', startHour: 21, startMin: 0, endHour: 23, endMin: 0, activity: 'Study Session 5', category: 'STUDY', xpReward: 120 },
];

// ── Study Subjects ──────────────────────────────────────────────
export const STUDY_SUBJECTS = [
  'GATE',
  'DSA',
  'AI/ML',
  'System Design',
  'Data Science',
  'Full Stack',
  'Custom',
] as const;

export type StudySubject = typeof STUDY_SUBJECTS[number];

// ── Helpers ──────────────────────────────────────────────────────
export function formatBlockTime(hour: number, min: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = min.toString().padStart(2, '0');
  return `${h}:${m} ${period}`;
}

export function blockDurationMinutes(block: TimetableBlock): number {
  return (block.endHour * 60 + block.endMin) - (block.startHour * 60 + block.startMin);
}

/** Check if the current time falls within a block */
export function isCurrentBlock(block: TimetableBlock, now: Date): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = block.startHour * 60 + block.startMin;
  const endMinutes = block.endHour * 60 + block.endMin;
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/** Check if a block's time has passed */
export function isBlockPast(block: TimetableBlock, now: Date): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = block.endHour * 60 + block.endMin;
  return currentMinutes >= endMinutes;
}

/** Check if it's sleep time (after 11 PM or before 5 AM) */
export function isSleepTime(now: Date): boolean {
  const hour = now.getHours();
  return hour >= 23 || hour < 5;
}

/** Get overtime minutes for a block */
export function getOvertimeMinutes(block: TimetableBlock, now: Date): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = block.endHour * 60 + block.endMin;
  return Math.max(0, currentMinutes - endMinutes);
}
