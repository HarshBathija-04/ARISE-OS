import type { AttributeKey, Difficulty, QuestType } from "@prisma/client";

export interface QuestTemplateDef {
  key: string;
  title: string;
  description: string;
  type: QuestType;
  difficulty: Difficulty;
  category: string;
  estMinutes: number;
  baseXp: number;
  attributeXp: Partial<Record<AttributeKey, number>>;
  coinReward?: number;
  streakKey?: string;
  failureNote?: string;
  /** Weight the quest engine uses when choosing the daily set (higher = more likely). */
  weight?: number;
  /** Rough time-of-day slot hint: "morning" | "day" | "evening" | "any". */
  slot?: "morning" | "day" | "evening" | "any";
}

/**
 * The pool the daily quest engine draws from. Tuned to Harsh's routine and goals.
 * baseXp is pre-multiplier; the XP engine applies difficulty/streak/quality on top.
 */
export const QUEST_TEMPLATES: QuestTemplateDef[] = [
  // ── Discipline / routine ──
  {
    key: "wake-5am", title: "Rise at 05:00", description: "Be awake and out of bed before 05:15.",
    type: "DAILY", difficulty: "C", category: "discipline", estMinutes: 5, baseXp: 90,
    attributeXp: { DIS: 22, CON: 18 }, coinReward: 4, streakKey: "wake", slot: "morning",
    failureNote: "Wake streak resets. Tomorrow's first quest becomes an easier re-entry.", weight: 10,
  },
  {
    key: "sleep-before-target", title: "Power Down", description: "Be in bed with screens off before 23:00.",
    type: "DAILY", difficulty: "D", category: "recovery", estMinutes: 5, baseXp: 70,
    attributeXp: { VIT: 18, DIS: 10 }, coinReward: 3, streakKey: "sleep", slot: "evening", weight: 8,
  },
  {
    key: "plan-day", title: "Set the Waypoints", description: "Plan today's blocks before starting work.",
    type: "DAILY", difficulty: "E", category: "discipline", estMinutes: 10, baseXp: 45,
    attributeXp: { DIS: 8, FOC: 6 }, coinReward: 2, slot: "morning", weight: 7,
  },

  // ── GATE / study ──
  {
    key: "gate-2h", title: "GATE Deep Study", description: "Two focused hours on a GATE core subject.",
    type: "DAILY", difficulty: "A", category: "study", estMinutes: 120, baseXp: 200,
    attributeXp: { INT: 40, FOC: 24, DIS: 16 }, coinReward: 9, streakKey: "gate", slot: "morning",
    failureNote: "GATE streak at risk.", weight: 10,
  },
  {
    key: "gate-1h", title: "GATE Session", description: "One hour on the current GATE topic.",
    type: "DAILY", difficulty: "C", category: "study", estMinutes: 60, baseXp: 110,
    attributeXp: { INT: 22, FOC: 12 }, coinReward: 5, streakKey: "gate", slot: "morning", weight: 6,
  },
  {
    key: "gate-pyq", title: "PYQ Skirmish", description: "Solve one set of GATE previous-year questions.",
    type: "SIDE", difficulty: "B", category: "study", estMinutes: 45, baseXp: 130,
    attributeXp: { INT: 26, SKL: 10, FOC: 10 }, coinReward: 6, slot: "day", weight: 5,
  },

  // ── DSA ──
  {
    key: "dsa-3", title: "Solve 3 DSA Problems", description: "Three problems on the current DSA topic.",
    type: "DAILY", difficulty: "B", category: "study", estMinutes: 75, baseXp: 150,
    attributeXp: { INT: 24, SKL: 24, FOC: 14 }, coinReward: 7, streakKey: "dsa", slot: "evening",
    failureNote: "DSA streak at risk.", weight: 10,
  },
  {
    key: "dsa-1-hard", title: "Break a Hard Problem", description: "Fully solve one Hard-rated problem, including edge cases.",
    type: "SIDE", difficulty: "A", category: "study", estMinutes: 60, baseXp: 170,
    attributeXp: { INT: 22, SKL: 30, FOC: 16 }, coinReward: 8, slot: "evening", weight: 4,
  },

  // ── AI / ML ──
  {
    key: "aiml-1h", title: "AI Engineer Path", description: "One hour on the current AI/ML module.",
    type: "SIDE", difficulty: "B", category: "study", estMinutes: 60, baseXp: 130,
    attributeXp: { INT: 22, SKL: 20 }, coinReward: 6, slot: "day", weight: 6,
  },

  // ── Full Stack ──
  {
    key: "fullstack-1h", title: "Full Stack Build", description: "One hour building on your current full-stack milestone.",
    type: "SIDE", difficulty: "B", category: "study", estMinutes: 60, baseXp: 130,
    attributeXp: { SKL: 26, INT: 14 }, coinReward: 6, slot: "day", weight: 5,
  },

  // ── System Design / Data Science morning block ──
  {
    key: "sysdesign-block", title: "Architecture Block", description: "09:00–11:00 System Design / Data Science focus block.",
    type: "SIDE", difficulty: "B", category: "study", estMinutes: 90, baseXp: 140,
    attributeXp: { INT: 24, SKL: 18, FOC: 12 }, coinReward: 6, slot: "morning", weight: 5,
  },

  // ── Deep work / focus ──
  {
    key: "deep-work-1", title: "Deep Work Session", description: "One uninterrupted 50-minute deep work block.",
    type: "DAILY", difficulty: "B", category: "focus", estMinutes: 50, baseXp: 120,
    attributeXp: { FOC: 26, INT: 12, DIS: 12 }, coinReward: 5, streakKey: "deepwork", slot: "any",
    failureNote: "Deep work streak at risk.", weight: 8,
  },
  {
    key: "no-reels-day", title: "Signal Discipline", description: "No reels or shorts for the entire day.",
    type: "DAILY", difficulty: "B", category: "focus", estMinutes: 1, baseXp: 120,
    attributeXp: { FOC: 24, DIS: 20 }, coinReward: 6, streakKey: "no-reels", slot: "any",
    failureNote: "No-reels streak resets. A recovery quest will help you re-anchor.", weight: 9,
  },

  // ── Fitness ──
  {
    key: "workout", title: "Iron Session", description: "Complete your planned home/gym workout.",
    type: "DAILY", difficulty: "B", category: "fitness", estMinutes: 45, baseXp: 130,
    attributeXp: { STR: 30, END: 14, VIT: 14 }, coinReward: 6, streakKey: "workout", slot: "any",
    failureNote: "Workout streak at risk.", weight: 8,
  },
  {
    key: "run", title: "Roadwork", description: "Run or brisk-walk at least 2 km.",
    type: "DAILY", difficulty: "C", category: "fitness", estMinutes: 25, baseXp: 100,
    attributeXp: { END: 26, VIT: 14, DIS: 8 }, coinReward: 5, streakKey: "cardio", slot: "morning", weight: 6,
  },
  {
    key: "hydrate", title: "Hydration Protocol", description: "Drink at least 3 litres of water today.",
    type: "SIDE", difficulty: "E", category: "fitness", estMinutes: 1, baseXp: 40,
    attributeXp: { VIT: 12 }, coinReward: 2, slot: "any", weight: 4,
  },

  // ── Recovery scaffolding (used by relapse flow) ──
  {
    key: "porn-free-day", title: "Clear Mind", description: "Maintain a pornography-free day.",
    type: "DAILY", difficulty: "B", category: "recovery", estMinutes: 1, baseXp: 110,
    attributeXp: { DIS: 22, VIT: 12, FOC: 10 }, coinReward: 5, streakKey: "porn-free", slot: "any",
    failureNote: "No level loss. A recovery quest activates to help you regain footing.", weight: 7,
  },
];

export function templateByKey(key: string): QuestTemplateDef | undefined {
  return QUEST_TEMPLATES.find((t) => t.key === key);
}
