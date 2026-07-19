/**
 * Starter content — the neutral seed set for NEW accounts (including demo).
 *
 * The original content files (habits.ts, main-quests.ts, skill-trees.ts)
 * describe the app owner's personal program (GATE prep, 5AM routine, shadow
 * recovery habits) and remain in use for accounts seeded before this split,
 * and as the quest engine's template pool. New accounts get this generic set
 * and customise from there.
 *
 * Streak keys deliberately reuse the global ones (wake, workout, deepwork,
 * cardio, sleep, no-reels, phone-curfew, gaming-control, routine) so quest
 * templates, streak achievements and re-entry logic keep working.
 */
import type { HabitDef, StreakDef } from "./habits.js";
import type { MainQuestDef, MainQuestStageDef } from "./main-quests.js";
import { SKILL_TREES, type SkillTreeDef } from "./skill-trees.js";

export const STARTER_HABITS: HabitDef[] = [
  { key: "wake-early", title: "Wake Up On Time", kind: "BUILD", streakKey: "wake" },
  { key: "study-session", title: "Focused Study", kind: "BUILD", streakKey: "study" },
  { key: "deep-work", title: "Deep Work Session", kind: "BUILD", streakKey: "deepwork" },
  { key: "workout", title: "Workout", kind: "BUILD", streakKey: "workout" },
  { key: "run-walk", title: "Run / Walk", kind: "BUILD", streakKey: "cardio" },
  { key: "read-daily", title: "Read 20 Minutes", kind: "BUILD", streakKey: "reading" },
  { key: "sleep-routine", title: "Sleep Before Target", kind: "BUILD", streakKey: "sleep" },
  // Shadow habits (private, tracked without shame — attention focused)
  { key: "no-reels", title: "Reels / Shorts", kind: "SHADOW", streakKey: "no-reels", private: true },
  { key: "unplanned-gaming", title: "Unplanned Gaming", kind: "SHADOW", streakKey: "gaming-control", private: true },
  { key: "late-phone", title: "Late-Night Phone", kind: "SHADOW", streakKey: "phone-curfew", private: true },
];

export const STARTER_STREAKS: StreakDef[] = [
  { key: "wake", title: "Wake-Up Streak" },
  { key: "study", title: "Study Streak" },
  { key: "deepwork", title: "Deep Work Streak" },
  { key: "workout", title: "Workout Streak" },
  { key: "cardio", title: "Cardio Streak" },
  { key: "reading", title: "Reading Streak" },
  { key: "sleep", title: "Sleep Routine Streak" },
  { key: "no-reels", title: "No-Reels Streak" },
  { key: "gaming-control", title: "Gaming Discipline Streak" },
  { key: "phone-curfew", title: "Phone Curfew Streak" },
  { key: "routine", title: "Routine Completion Streak" },
];

const stage = (key: string, title: string, description: string, targetUnits = 100): MainQuestStageDef => ({
  key, title, description, targetUnits,
});

export const STARTER_MAIN_QUESTS: MainQuestDef[] = [
  {
    key: "skill-mastery", title: "Skill Mastery Path",
    description: "Pick your craft and pursue genuine mastery, stage by stage.",
    theme: "#39a7ff", order: 1,
    stages: [
      stage("foundations", "Foundations", "Build solid fundamentals in your chosen field.", 100),
      stage("deep-practice", "Deep Practice", "Deliberate, focused practice on the hard parts.", 150),
      stage("applied-projects", "Applied Projects", "Use the skill on real projects.", 150),
      stage("portfolio", "Portfolio", "Produce work you can show.", 120),
      stage("mastery", "Mastery", "Operate at a level others seek out.", 150),
    ],
  },
  {
    key: "physical-ascension", title: "Physical Ascension",
    description: "Build muscle, strength, and athletic discipline.",
    theme: "#ff5db1", order: 2,
    stages: [
      stage("movement-recovery", "Movement Recovery", "Mobility and pain-free basics.", 60),
      stage("workout-consistency", "Workout Consistency", "Establish a repeatable routine.", 100),
      stage("strength-foundation", "Strength Foundation", "Progressive overload fundamentals.", 150),
      stage("muscle-building", "Muscle Building", "Hypertrophy and nutrition.", 200),
      stage("endurance", "Endurance", "Cardio base and stamina.", 120),
      stage("athletic-discipline", "Athletic Discipline", "Structured gym program.", 150),
    ],
  },
  {
    key: "mind-discipline", title: "Mind & Discipline",
    description: "Reclaim your attention and build an unshakeable routine.",
    theme: "#8b5cff", order: 3,
    stages: [
      stage("attention-reset", "Attention Reset", "Cut doomscrolling and reclaim your feed time.", 80),
      stage("deep-focus", "Deep Focus", "Make daily deep work a default.", 120),
      stage("reading-habit", "Reading Habit", "Read consistently, every day.", 100),
      stage("stillness", "Stillness", "Meditation, journaling, and recovery.", 100),
    ],
  },
];

/** Generic skill trees — everything except the owner's GATE prep tree. */
export const STARTER_SKILL_TREES: SkillTreeDef[] = SKILL_TREES.filter((t) => t.key !== "gate");
