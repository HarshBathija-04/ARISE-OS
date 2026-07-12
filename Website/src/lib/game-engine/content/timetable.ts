/**
 * Timetable content — the shared daily schedule definition.
 *
 * Ported from the mobile app's `src/constants/timetable.ts` so both frontends
 * seed the same default schedule, categories, XP rewards, and study subjects.
 */
import type { TimetableCategory } from "@prisma/client";

// ── Default block shape (before it gets an id / userId in the DB) ──
export interface DefaultBlock {
  order: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  activity: string;
  category: TimetableCategory;
  xpReward: number;
}

// ── XP per category ──
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

// ── Category metadata (label + accent + focus-mode mapping) ──
export interface CategoryDef {
  code: TimetableCategory;
  label: string;
  color: string; // tailwind-ish token used by the UI
  focusCategory: string | null; // maps to the website FocusCategory enum
}

export const CATEGORY_DEFS: CategoryDef[] = [
  { code: "STUDY", label: "Study", color: "arc-blue", focusCategory: "GATE" },
  { code: "EXERCISE", label: "Exercise", color: "success", focusCategory: null },
  { code: "MORNING_ROUTINE", label: "Morning Routine", color: "arc-violet", focusCategory: null },
  { code: "BATH", label: "Bath", color: "arc-cyan", focusCategory: null },
  { code: "BREAKFAST", label: "Breakfast", color: "rank-gold", focusCategory: null },
  { code: "LUNCH", label: "Lunch", color: "rank-gold", focusCategory: null },
  { code: "DINNER", label: "Dinner", color: "rank-gold", focusCategory: null },
  { code: "GAMING", label: "Gaming", color: "arc-violet", focusCategory: null },
  { code: "BREAK", label: "Break", color: "slate-400", focusCategory: null },
  { code: "SLEEP", label: "Sleep", color: "slate-500", focusCategory: null },
];

export function categoryDef(code: TimetableCategory): CategoryDef {
  return CATEGORY_DEFS.find((c) => c.code === code) ?? CATEGORY_DEFS[0]!;
}

// ── Default daily schedule (5 AM – 11 PM) ──
export const DEFAULT_TIMETABLE: DefaultBlock[] = [
  { order: 0, startHour: 5, startMin: 0, endHour: 5, endMin: 15, activity: "Morning Routine", category: "MORNING_ROUTINE", xpReward: 20 },
  { order: 1, startHour: 5, startMin: 15, endHour: 6, endMin: 15, activity: "Exercise", category: "EXERCISE", xpReward: 80 },
  { order: 2, startHour: 6, startMin: 15, endHour: 6, endMin: 30, activity: "Bath", category: "BATH", xpReward: 10 },
  { order: 3, startHour: 6, startMin: 30, endHour: 8, endMin: 0, activity: "Study Session 1", category: "STUDY", xpReward: 120 },
  { order: 4, startHour: 8, startMin: 0, endHour: 9, endMin: 0, activity: "Breakfast", category: "BREAKFAST", xpReward: 15 },
  { order: 5, startHour: 9, startMin: 0, endHour: 11, endMin: 0, activity: "Study Session 2", category: "STUDY", xpReward: 120 },
  { order: 6, startHour: 11, startMin: 0, endHour: 11, endMin: 30, activity: "Break", category: "BREAK", xpReward: 5 },
  { order: 7, startHour: 11, startMin: 30, endHour: 14, endMin: 0, activity: "Study Session 3", category: "STUDY", xpReward: 120 },
  { order: 8, startHour: 14, startMin: 0, endHour: 15, endMin: 0, activity: "Lunch", category: "LUNCH", xpReward: 20 },
  { order: 9, startHour: 15, startMin: 0, endHour: 17, endMin: 0, activity: "Study Session 4", category: "STUDY", xpReward: 120 },
  { order: 10, startHour: 17, startMin: 0, endHour: 19, endMin: 0, activity: "Gaming", category: "GAMING", xpReward: 15 },
  { order: 11, startHour: 19, startMin: 0, endHour: 20, endMin: 0, activity: "Break", category: "BREAK", xpReward: 5 },
  { order: 12, startHour: 20, startMin: 0, endHour: 21, endMin: 0, activity: "Dinner", category: "DINNER", xpReward: 20 },
  { order: 13, startHour: 21, startMin: 0, endHour: 23, endMin: 0, activity: "Study Session 5", category: "STUDY", xpReward: 120 },
];

export const STUDY_SUBJECTS = [
  "GATE",
  "DSA",
  "AI/ML",
  "System Design",
  "Data Science",
  "Full Stack",
  "Custom",
] as const;

export type StudySubject = (typeof STUDY_SUBJECTS)[number];

// ── Time helpers (pure, shared by web UI + service) ──
export function formatBlockTime(hour: number, min: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const m = min.toString().padStart(2, "0");
  return `${h}:${m} ${period}`;
}

export function blockStartMinutes(b: { startHour: number; startMin: number }): number {
  return b.startHour * 60 + b.startMin;
}

export function blockEndMinutes(b: { endHour: number; endMin: number }): number {
  return b.endHour * 60 + b.endMin;
}

export function blockDurationMinutes(b: {
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
}): number {
  return blockEndMinutes(b) - blockStartMinutes(b);
}

export function isSleepTime(now: Date): boolean {
  const hour = now.getHours();
  return hour >= 23 || hour < 5;
}
