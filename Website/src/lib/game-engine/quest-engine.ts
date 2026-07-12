/**
 * ═══════════════════════════════════════════════════════════════
 * QUEST GENERATION ENGINE
 * Deterministic-ish daily quest selection tuned to the player's state.
 * Pure planning logic — persistence happens in the server layer.
 * ═══════════════════════════════════════════════════════════════
 *
 * ADAPTIVE RULES
 *   - completion < 40% for 3 days  → reduce quest volume (avoid overwhelm)
 *   - completion > 85% for 7 days  → add one harder challenge
 *   - a failing streak (wake/workout/dsa) → prioritise a re-entry quest for it
 *   - rising distraction            → inject a focus / digital-control quest
 *   - active recovery               → keep the day light, add recovery steps
 */

import type { Difficulty } from "@prisma/client";
import { QUEST_TEMPLATES, type QuestTemplateDef } from "./content/quest-templates";

export interface QuestEngineContext {
  /** Rolling completion ratios for recent days, newest last. */
  recentCompletion: number[];
  /** Streak keys that are currently broken/at risk and should get a re-entry quest. */
  failingStreaks: string[];
  /** Distraction minutes yesterday (reels/shorts/unplanned). */
  distractionMinutesYesterday: number;
  /** Is a recovery quest currently active? */
  inRecovery: boolean;
  /** Player difficulty bias from settings (1.0 = normal). */
  difficultyBias: number;
  /** Weakest attribute key, to bias selection toward it. */
  weakestAttribute?: string;
}

export interface PlannedQuest extends QuestTemplateDef {
  reason: string; // why the engine chose this quest (shown to the player / AI Guide)
}

const DIFF_ORDER: Difficulty[] = ["E", "D", "C", "B", "A", "S", "SS"];

function harder(d: Difficulty): Difficulty {
  const i = DIFF_ORDER.indexOf(d);
  return DIFF_ORDER[Math.min(DIFF_ORDER.length - 1, i + 1)]!;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0.6; // neutral prior for a brand-new player
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Base daily plan: the "always-on" core routine quests.
 * These anchor the player's identity and are chosen first.
 */
const CORE_KEYS = [
  "wake-5am",
  "gate-2h",
  "dsa-3",
  "deep-work-1",
  "workout",
  "no-reels-day",
  "sleep-before-target",
];

export function generateDailyQuests(ctx: QuestEngineContext): PlannedQuest[] {
  const last3 = ctx.recentCompletion.slice(-3);
  const last7 = ctx.recentCompletion.slice(-7);
  const struggling = last3.length === 3 && avg(last3) < 0.4;
  const thriving = last7.length >= 7 && avg(last7) > 0.85;

  const byKey = new Map(QUEST_TEMPLATES.map((t) => [t.key, t]));
  const chosen: PlannedQuest[] = [];
  const used = new Set<string>();

  const push = (key: string, reason: string, mutate?: (q: QuestTemplateDef) => QuestTemplateDef) => {
    if (used.has(key)) return;
    const t = byKey.get(key);
    if (!t) return;
    used.add(key);
    chosen.push({ ...(mutate ? mutate(t) : t), reason });
  };

  // 1) Failing streaks get a gentle, prioritised re-entry quest.
  for (const streak of ctx.failingStreaks) {
    const t = QUEST_TEMPLATES.find((q) => q.streakKey === streak);
    if (t) {
      push(t.key, `Re-entry quest: your ${streak} streak needs rebuilding — kept approachable.`, (q) => ({
        ...q,
        // Ease difficulty by one step for re-entry so it's winnable.
        difficulty: DIFF_ORDER[Math.max(0, DIFF_ORDER.indexOf(q.difficulty) - 1)]!,
      }));
    }
  }

  // 2) Rising distraction → force a focus / digital-control quest.
  if (ctx.distractionMinutesYesterday > 60) {
    push("no-reels-day", "Distraction spiked yesterday — reclaiming your attention is today's priority.");
    push("deep-work-1", "A deep work block to rebuild focus after high distraction.");
  }

  // 3) Core routine. If struggling, trim the core to the 4 highest-leverage anchors.
  const coreForToday = struggling ? CORE_KEYS.slice(0, 4) : CORE_KEYS;
  for (const key of coreForToday) {
    push(key, struggling
      ? "Reduced core set — three tough days in a row. Win small, rebuild momentum."
      : "Core routine quest.");
  }

  // 4) Weakest-attribute nudge: add a side quest that trains the weak area.
  if (ctx.weakestAttribute && !struggling) {
    const t = QUEST_TEMPLATES.find(
      (q) => q.attributeXp[ctx.weakestAttribute as keyof typeof q.attributeXp] && q.type === "SIDE",
    );
    if (t) push(t.key, `Targeting your weakest attribute (${ctx.weakestAttribute}).`);
  }

  // 5) Thriving → one harder challenge quest.
  if (thriving) {
    const challenge = QUEST_TEMPLATES.find((q) => q.type === "SIDE" && q.difficulty === "A");
    if (challenge) {
      push(challenge.key, "Seven strong days — the System raises the challenge.", (q) => ({
        ...q,
        difficulty: harder(q.difficulty),
        baseXp: Math.round(q.baseXp * 1.15),
      }));
    }
  }

  // 6) Recovery mode keeps the day light — cap at 5 quests.
  const cap = ctx.inRecovery ? 5 : struggling ? 5 : thriving ? 9 : 8;
  return chosen.slice(0, cap);
}
