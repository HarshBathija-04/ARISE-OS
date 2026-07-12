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
  /** Weight the quest engine uses when randomly sampling the daily set (higher = more likely). */
  weight?: number;
  /** Rough time-of-day slot hint: "morning" | "day" | "evening" | "any". */
  slot?: "morning" | "day" | "evening" | "any";
}

/**
 * ═══════════════════════════════════════════════════════════════
 * THE QUEST POOL
 * ═══════════════════════════════════════════════════════════════
 * A broad, categorized pool the daily engine draws from. Each day the engine
 * always includes the ANCHOR quests (the non-negotiable identity habits) and
 * then randomly samples the rest — weighted by `weight`, biased toward the
 * player's weakest attribute, and varied across category/slot. Randomness is
 * seeded by the day, so a given day's set is stable but every day differs.
 *
 * baseXp is pre-multiplier; the XP engine applies difficulty/streak/quality on top.
 */
export const QUEST_TEMPLATES: QuestTemplateDef[] = [
  // ══════════════════════ DISCIPLINE / ROUTINE ══════════════════════
  {
    key: "wake-5am", title: "Rise at 05:00", description: "Be awake and out of bed before 05:15.",
    type: "DAILY", difficulty: "C", category: "discipline", estMinutes: 5, baseXp: 90,
    attributeXp: { DIS: 22, CON: 18 }, coinReward: 4, streakKey: "wake", slot: "morning",
    failureNote: "Wake streak resets. Tomorrow's first quest becomes an easier re-entry.", weight: 10,
  },
  {
    key: "sleep-before-target", title: "Power Down", description: "Be in bed with screens off before 23:00.",
    type: "DAILY", difficulty: "D", category: "recovery", estMinutes: 5, baseXp: 70,
    attributeXp: { VIT: 18, DIS: 10 }, coinReward: 3, streakKey: "sleep", slot: "evening",
    failureNote: "Sleep streak resets — tomorrow's rise will hurt more.", weight: 9,
  },
  {
    key: "plan-day", title: "Set the Waypoints", description: "Plan today's blocks before starting work.",
    type: "DAILY", difficulty: "E", category: "discipline", estMinutes: 10, baseXp: 45,
    attributeXp: { DIS: 8, FOC: 6 }, coinReward: 2, streakKey: "routine", slot: "morning", weight: 8,
  },
  {
    key: "make-bed", title: "First Victory", description: "Make your bed within 10 minutes of waking.",
    type: "SIDE", difficulty: "E", category: "discipline", estMinutes: 5, baseXp: 30,
    attributeXp: { DIS: 8, CON: 6 }, coinReward: 1, slot: "morning", weight: 5,
  },
  {
    key: "evening-review", title: "After-Action Report", description: "Log a 5-line review of the day: wins, misses, tomorrow's first move.",
    type: "SIDE", difficulty: "E", category: "discipline", estMinutes: 10, baseXp: 50,
    attributeXp: { DIS: 10, FOC: 6, CON: 6 }, coinReward: 2, streakKey: "routine", slot: "evening", weight: 6,
  },
  {
    key: "cold-shower", title: "The Cold Gate", description: "End your shower with 60 seconds of cold water.",
    type: "SIDE", difficulty: "D", category: "discipline", estMinutes: 5, baseXp: 55,
    attributeXp: { DIS: 16, VIT: 8 }, coinReward: 3, slot: "morning", weight: 5,
  },

  // ══════════════════════ GATE / STUDY ══════════════════════
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
    attributeXp: { INT: 26, SKL: 10, FOC: 10 }, coinReward: 6, slot: "day", weight: 6,
  },
  {
    key: "gate-revise", title: "Consolidate the Front", description: "Revise and make notes on yesterday's GATE topic.",
    type: "SIDE", difficulty: "C", category: "study", estMinutes: 40, baseXp: 90,
    attributeXp: { INT: 18, CON: 10, FOC: 8 }, coinReward: 4, slot: "day", weight: 5,
  },
  {
    key: "mock-test", title: "Trial by Fire", description: "Sit one timed GATE/subject mock and review mistakes.",
    type: "SIDE", difficulty: "A", category: "study", estMinutes: 90, baseXp: 180,
    attributeXp: { INT: 34, FOC: 20, DIS: 14 }, coinReward: 8, slot: "day", weight: 3,
  },

  // ══════════════════════ DSA ══════════════════════
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
  {
    key: "dsa-pattern-drill", title: "Pattern Drill", description: "Grind 5 easy/medium problems of a single pattern to lock it in.",
    type: "SIDE", difficulty: "C", category: "study", estMinutes: 60, baseXp: 120,
    attributeXp: { SKL: 22, INT: 14, CON: 8 }, coinReward: 5, slot: "evening", weight: 5,
  },

  // ══════════════════════ AI / ML ══════════════════════
  {
    key: "aiml-1h", title: "AI Engineer Path", description: "One hour on the current AI/ML module.",
    type: "SIDE", difficulty: "B", category: "study", estMinutes: 60, baseXp: 130,
    attributeXp: { INT: 22, SKL: 20 }, coinReward: 6, slot: "day", weight: 6,
  },
  {
    key: "aiml-build", title: "Ship a Model", description: "Build or fine-tune a small model / notebook end to end.",
    type: "SIDE", difficulty: "A", category: "study", estMinutes: 90, baseXp: 165,
    attributeXp: { SKL: 30, INT: 22, FOC: 12 }, coinReward: 7, slot: "day", weight: 3,
  },

  // ══════════════════════ FULL STACK / SYSTEM ══════════════════════
  {
    key: "fullstack-1h", title: "Full Stack Build", description: "One hour building on your current full-stack milestone.",
    type: "SIDE", difficulty: "B", category: "study", estMinutes: 60, baseXp: 130,
    attributeXp: { SKL: 26, INT: 14 }, coinReward: 6, slot: "day", weight: 5,
  },
  {
    key: "ship-feature", title: "Ship It", description: "Merge one working feature/commit to a real project today.",
    type: "SIDE", difficulty: "B", category: "study", estMinutes: 75, baseXp: 145,
    attributeXp: { SKL: 28, DIS: 10, FOC: 10 }, coinReward: 6, slot: "day", weight: 4,
  },
  {
    key: "sysdesign-block", title: "Architecture Block", description: "A 90-minute System Design / Data Science focus block.",
    type: "SIDE", difficulty: "B", category: "study", estMinutes: 90, baseXp: 140,
    attributeXp: { INT: 24, SKL: 18, FOC: 12 }, coinReward: 6, slot: "morning", weight: 5,
  },

  // ══════════════════════ DEEP WORK / FOCUS ══════════════════════
  {
    key: "deep-work-1", title: "Deep Work Session", description: "One uninterrupted 50-minute deep work block.",
    type: "DAILY", difficulty: "B", category: "focus", estMinutes: 50, baseXp: 120,
    attributeXp: { FOC: 26, INT: 12, DIS: 12 }, coinReward: 5, streakKey: "deepwork", slot: "any",
    failureNote: "Deep work streak at risk.", weight: 9,
  },
  {
    key: "deep-work-2", title: "Double Block", description: "Two back-to-back 50-minute deep work blocks with a short break.",
    type: "SIDE", difficulty: "A", category: "focus", estMinutes: 110, baseXp: 180,
    attributeXp: { FOC: 34, DIS: 16, INT: 12 }, coinReward: 7, slot: "day", weight: 3,
  },
  {
    key: "no-reels-day", title: "Signal Discipline", description: "No reels or shorts for the entire day.",
    type: "DAILY", difficulty: "B", category: "focus", estMinutes: 1, baseXp: 120,
    attributeXp: { FOC: 24, DIS: 20 }, coinReward: 6, streakKey: "no-reels", slot: "any",
    failureNote: "No-reels streak resets. A recovery quest will help you re-anchor.", weight: 9,
  },
  {
    key: "phone-curfew", title: "Phone Curfew", description: "No phone in the last hour before bed.",
    type: "SIDE", difficulty: "C", category: "focus", estMinutes: 1, baseXp: 70,
    attributeXp: { DIS: 16, FOC: 10, VIT: 6 }, coinReward: 3, streakKey: "phone-curfew", slot: "evening", weight: 6,
  },
  {
    key: "single-task-hour", title: "One Thing", description: "Spend one full hour on a single task — no tab-switching.",
    type: "SIDE", difficulty: "B", category: "focus", estMinutes: 60, baseXp: 100,
    attributeXp: { FOC: 24, DIS: 10 }, coinReward: 4, slot: "any", weight: 5,
  },

  // ══════════════════════ FITNESS ══════════════════════
  {
    key: "workout", title: "Iron Session", description: "Complete your planned home/gym workout.",
    type: "DAILY", difficulty: "B", category: "fitness", estMinutes: 45, baseXp: 130,
    attributeXp: { STR: 30, END: 14, VIT: 14 }, coinReward: 6, streakKey: "workout", slot: "any",
    failureNote: "Workout streak at risk.", weight: 9,
  },
  {
    key: "run", title: "Roadwork", description: "Run or brisk-walk at least 2 km.",
    type: "DAILY", difficulty: "C", category: "fitness", estMinutes: 25, baseXp: 100,
    attributeXp: { END: 26, VIT: 14, DIS: 8 }, coinReward: 5, streakKey: "cardio", slot: "morning", weight: 7,
  },
  {
    key: "mobility", title: "Loosen the Armor", description: "10 minutes of stretching / mobility work.",
    type: "SIDE", difficulty: "E", category: "fitness", estMinutes: 10, baseXp: 40,
    attributeXp: { VIT: 12, END: 8 }, coinReward: 2, slot: "any", weight: 5,
  },
  {
    key: "steps-8k", title: "March Order", description: "Hit at least 8,000 steps today.",
    type: "SIDE", difficulty: "D", category: "fitness", estMinutes: 30, baseXp: 60,
    attributeXp: { END: 16, VIT: 10 }, coinReward: 3, slot: "any", weight: 5,
  },
  {
    key: "hydrate", title: "Hydration Protocol", description: "Drink at least 3 litres of water today.",
    type: "SIDE", difficulty: "E", category: "fitness", estMinutes: 1, baseXp: 40,
    attributeXp: { VIT: 12 }, coinReward: 2, slot: "any", weight: 5,
  },

  // ══════════════════════ MIND / GROWTH ══════════════════════
  {
    key: "meditate", title: "Still the Mind", description: "10 minutes of meditation or breathwork.",
    type: "SIDE", difficulty: "D", category: "mind", estMinutes: 10, baseXp: 55,
    attributeXp: { FOC: 16, VIT: 8, DIS: 6 }, coinReward: 3, slot: "any", weight: 6,
  },
  {
    key: "read-20", title: "Feed the Mind", description: "Read 20 pages of a book (non-fiction or technical).",
    type: "SIDE", difficulty: "D", category: "mind", estMinutes: 30, baseXp: 65,
    attributeXp: { INT: 16, FOC: 8 }, coinReward: 3, slot: "evening", weight: 5,
  },
  {
    key: "journal", title: "Chronicle", description: "Write a short journal entry — thoughts, gratitude, or a problem you're chewing on.",
    type: "SIDE", difficulty: "E", category: "mind", estMinutes: 10, baseXp: 45,
    attributeXp: { DIS: 8, VIT: 6, FOC: 4 }, coinReward: 2, slot: "evening", weight: 4,
  },

  // ══════════════════════ RECOVERY / SHADOW ══════════════════════
  {
    key: "porn-free-day", title: "Clear Mind", description: "Maintain a pornography-free day.",
    type: "DAILY", difficulty: "B", category: "recovery", estMinutes: 1, baseXp: 110,
    attributeXp: { DIS: 22, VIT: 12, FOC: 10 }, coinReward: 5, streakKey: "porn-free", slot: "any",
    failureNote: "No level loss. A recovery quest activates to help you regain footing.", weight: 7,
  },
  {
    key: "self-control-day", title: "Hold the Line", description: "A day of self-control — honor your commitment.",
    type: "DAILY", difficulty: "B", category: "recovery", estMinutes: 1, baseXp: 100,
    attributeXp: { DIS: 20, CON: 12, VIT: 8 }, coinReward: 5, streakKey: "nofap", slot: "any",
    failureNote: "No shame — a recovery quest helps you re-anchor.", weight: 6,
  },
  {
    key: "gaming-control", title: "Contain the Distraction", description: "No unplanned gaming today — play only in scheduled slots.",
    type: "SIDE", difficulty: "C", category: "recovery", estMinutes: 1, baseXp: 80,
    attributeXp: { DIS: 18, FOC: 10 }, coinReward: 4, streakKey: "gaming-control", slot: "any", weight: 5,
  },
];

/**
 * ANCHOR quests — the identity-defining habits included in EVERY daily set,
 * regardless of the random draw. Order here defines fallback priority.
 */
export const ANCHOR_KEYS = [
  "wake-5am",
  "gate-2h",
  "dsa-3",
  "workout",
  "sleep-before-target",
] as const;

export function templateByKey(key: string): QuestTemplateDef | undefined {
  return QUEST_TEMPLATES.find((t) => t.key === key);
}
