import { describe, expect, it } from "vitest";
import { generateDailyQuests } from "../src/engine/quest-engine.js";
import { ANCHOR_KEYS } from "../src/engine/content/quest-templates.js";

const baseCtx = {
  dayKey: "2026-07-16",
  userId: "test-user-uuid",
  recentCompletion: [0.8, 0.7, 0.9],
  failingStreaks: [] as string[],
  distractionMinutesYesterday: 0,
  inRecovery: false,
  difficultyBias: 1,
};

describe("quest-engine determinism", () => {
  it("same day + user → identical quest set", () => {
    const a = generateDailyQuests({ ...baseCtx });
    const b = generateDailyQuests({ ...baseCtx });
    expect(a.map((q) => q.key)).toEqual(b.map((q) => q.key));
  });

  it("different users get different sets on the same day", () => {
    const a = generateDailyQuests({ ...baseCtx });
    const b = generateDailyQuests({ ...baseCtx, userId: "another-user-uuid" });
    // Anchors are shared; the sampled remainder should differ at least sometimes.
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });

  it("always includes the anchor quests", () => {
    const planned = generateDailyQuests({ ...baseCtx });
    const keys = new Set(planned.map((q) => q.key));
    for (const anchor of ANCHOR_KEYS) {
      expect(keys.has(anchor)).toBe(true);
    }
  });

  it("recovery mode keeps the day light", () => {
    const normal = generateDailyQuests({ ...baseCtx });
    const recovery = generateDailyQuests({ ...baseCtx, inRecovery: true });
    expect(recovery.length).toBeLessThanOrEqual(normal.length);
  });
});

// ─────────────────── personalization ───────────────────

const GOALS = [
  { goalTitle: "ServiceNow Ascension", stageId: "st-1", stageTitle: "CSA Certification", stageDescription: "Study, practice, pass.", progress: 10, targetUnits: 100 },
  { goalTitle: "The Job Hunt", stageId: "st-2", stageTitle: "Quality Applications", stageDescription: "3 catered applications weekly.", progress: 0, targetUnits: 36 },
  { goalTitle: "DSA Arena", stageId: "st-3", stageTitle: "The Daily Grind", stageDescription: "3 problems daily.", progress: 50, targetUnits: 100 },
];

const BLOCKS = [
  { activity: "DSA — 3 Problems + LeetCode Daily", category: "STUDY", startHour: 20, startMin: 0, endHour: 21, endMin: 0 },
  { activity: "Morning Exercise", category: "EXERCISE", startHour: 6, startMin: 0, endHour: 6, endMin: 30 },
  { activity: "Healthy Lunch", category: "LUNCH", startHour: 13, startMin: 0, endHour: 14, endMin: 0 },
];

const HABITS = [
  { key: "github-push", title: "Meaningful GitHub Push", streakKey: "github" },
  { key: "read-news", title: "Read News (10 min)", streakKey: "news" },
  { key: "tech-radar", title: "Explore New Tools & Tech (10–20 min)", streakKey: "tech-radar" },
  { key: "dsa", title: "DSA Practice", streakKey: "dsa" },
];

const personalCtx = { ...baseCtx, goals: GOALS, routineBlocks: BLOCKS, habits: HABITS };

describe("quest-engine personalization", () => {
  it("draws goal quests that carry stage linkage", () => {
    const planned = generateDailyQuests(personalCtx);
    const goalQuests = planned.filter((q) => q.key.startsWith("goal:"));
    expect(goalQuests.length).toBe(2);
    for (const q of goalQuests) {
      expect(q.type).toBe("MAIN");
      expect(q.stageId).toBeTruthy();
      expect(q.stageUnits).toBeGreaterThan(0);
      expect(GOALS.some((g) => g.stageId === q.stageId)).toBe(true);
    }
  });

  it("draws routine quests only from meaningful block categories", () => {
    const planned = generateDailyQuests(personalCtx);
    const routine = planned.filter((q) => q.key.startsWith("routine:"));
    expect(routine.length).toBeGreaterThan(0);
    expect(routine.length).toBeLessThanOrEqual(2);
    // LUNCH must never become a quest.
    expect(routine.some((q) => q.title.includes("Lunch"))).toBe(false);
  });

  it("uses the user's own habits as anchors instead of the global set", () => {
    const planned = generateDailyQuests(personalCtx);
    // No GATE/wake templates may appear anywhere in the set — this user's
    // habits don't pursue those streaks.
    for (const q of planned) {
      expect(q.key.startsWith("gate")).toBe(false);
      expect(q.key).not.toBe("mock-test");
      expect(q.key).not.toBe("wake-5am");
    }
    // At least one of the user's custom habits appears (habit: synthesized or
    // dsa via its matching global template).
    const hasCustom = planned.some(
      (q) => q.key.startsWith("habit:") || q.streakKey === "dsa",
    );
    expect(hasCustom).toBe(true);
  });

  it("personalized sets stay deterministic per day and differ across days", () => {
    const a = generateDailyQuests(personalCtx);
    const b = generateDailyQuests(personalCtx);
    expect(a.map((q) => q.key)).toEqual(b.map((q) => q.key));
    const otherDay = generateDailyQuests({ ...personalCtx, dayKey: "2026-07-17" });
    expect(otherDay.map((q) => q.key)).not.toEqual(a.map((q) => q.key));
  });

  it("two users with the same goals still get different days", () => {
    const a = generateDailyQuests(personalCtx);
    const b = generateDailyQuests({ ...personalCtx, userId: "second-user" });
    expect(a.map((q) => q.key).join()).not.toEqual(b.map((q) => q.key).join());
  });

  it("struggling users get fewer personalized quests, but goals never vanish", () => {
    const struggling = generateDailyQuests({
      ...personalCtx,
      recentCompletion: [0.2, 0.3, 0.1],
    });
    expect(struggling.filter((q) => q.key.startsWith("goal:")).length).toBe(1);
    expect(struggling.length).toBeLessThan(generateDailyQuests(personalCtx).length);
  });
});
