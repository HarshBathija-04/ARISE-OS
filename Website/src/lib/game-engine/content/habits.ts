import type { HabitKind } from "@prisma/client";

export interface HabitDef {
  key: string;
  title: string;
  kind: HabitKind;
  streakKey?: string;
  private?: boolean;
}

export const HABITS: HabitDef[] = [
  { key: "wake-5am", title: "Wake at 5:00 AM", kind: "BUILD", streakKey: "wake" },
  { key: "gate-study", title: "GATE Study", kind: "BUILD", streakKey: "gate" },
  { key: "dsa", title: "DSA Practice", kind: "BUILD", streakKey: "dsa" },
  { key: "deep-work", title: "Deep Work Session", kind: "BUILD", streakKey: "deepwork" },
  { key: "workout", title: "Workout", kind: "BUILD", streakKey: "workout" },
  { key: "run-walk", title: "Run / Walk", kind: "BUILD", streakKey: "cardio" },
  { key: "sleep-routine", title: "Sleep Before Target", kind: "BUILD", streakKey: "sleep" },
  // Shadow habits (private, tracked without shame — recovery focused)
  { key: "no-reels", title: "Reels / Shorts", kind: "SHADOW", streakKey: "no-reels", private: true },
  { key: "porn-free", title: "Pornography", kind: "SHADOW", streakKey: "porn-free", private: true },
  { key: "no-nofap", title: "Masturbation", kind: "SHADOW", streakKey: "nofap", private: true },
  { key: "unplanned-gaming", title: "Unplanned Gaming", kind: "SHADOW", streakKey: "gaming-control", private: true },
  { key: "late-phone", title: "Late-Night Phone", kind: "SHADOW", streakKey: "phone-curfew", private: true },
];

export interface StreakDef {
  key: string;
  title: string;
}

export const STREAKS: StreakDef[] = [
  { key: "wake", title: "Wake-Up Streak" },
  { key: "gate", title: "GATE Streak" },
  { key: "dsa", title: "DSA Streak" },
  { key: "workout", title: "Workout Streak" },
  { key: "deepwork", title: "Deep Work Streak" },
  { key: "cardio", title: "Cardio Streak" },
  { key: "sleep", title: "Sleep Routine Streak" },
  { key: "no-reels", title: "No-Reels Streak" },
  { key: "porn-free", title: "Porn-Free Streak" },
  { key: "nofap", title: "Self-Control Streak" },
  { key: "gaming-control", title: "Gaming Discipline Streak" },
  { key: "phone-curfew", title: "Phone Curfew Streak" },
  { key: "routine", title: "Routine Completion Streak" },
];
