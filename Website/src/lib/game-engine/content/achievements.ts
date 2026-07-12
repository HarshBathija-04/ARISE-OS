import type { Rarity } from "@prisma/client";

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  rarity: Rarity;
  category: string;
  metric: string; // counter watched by the achievement engine
  targetValue: number;
  xpReward: number;
  coinReward: number;
  titleKey?: string;
  hidden?: boolean;
}

const RARITY_XP: Record<Rarity, number> = {
  COMMON: 60,
  RARE: 150,
  EPIC: 350,
  LEGENDARY: 750,
  MYTHIC: 1500,
};
const RARITY_COINS: Record<Rarity, number> = {
  COMMON: 5,
  RARE: 12,
  EPIC: 30,
  LEGENDARY: 60,
  MYTHIC: 120,
};

let ladderId = 0;
/** Build a tiered ladder of achievements for a single metric. */
function ladder(
  metric: string,
  category: string,
  label: (v: number) => { title: string; description: string },
  tiers: Array<{ value: number; rarity: Rarity; titleKey?: string; hidden?: boolean }>,
): AchievementDef[] {
  ladderId += 1;
  return tiers.map((t, i) => {
    const l = label(t.value);
    return {
      key: `${metric}-${i}-${t.value}`,
      title: l.title,
      description: l.description,
      rarity: t.rarity,
      category,
      metric,
      targetValue: t.value,
      xpReward: RARITY_XP[t.rarity],
      coinReward: RARITY_COINS[t.rarity],
      titleKey: t.titleKey,
      hidden: t.hidden,
    };
  });
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Onboarding / one-offs ──
  { key: "first-step", title: "First Step", description: "Complete your first quest.", rarity: "COMMON", category: "milestone", metric: "quest_completed", targetValue: 1, xpReward: 80, coinReward: 5, titleKey: "the-initiate" },
  { key: "awakening", title: "Awakening", description: "Reach Level 5.", rarity: "COMMON", category: "level", metric: "level", targetValue: 5, xpReward: 120, coinReward: 8 },
  { key: "first-focus", title: "Into the Deep", description: "Complete your first deep work session.", rarity: "COMMON", category: "focus", metric: "focus_sessions", targetValue: 1, xpReward: 60, coinReward: 5 },
  { key: "first-workout", title: "First Rep", description: "Log your first workout.", rarity: "COMMON", category: "fitness", metric: "workout_count", targetValue: 1, xpReward: 60, coinReward: 5 },
  { key: "first-recovery", title: "Back on Your Feet", description: "Complete your first recovery quest.", rarity: "RARE", category: "recovery", metric: "recovery_completed", targetValue: 1, xpReward: 120, coinReward: 10 },

  // ── Quests completed ──
  ...ladder("quest_completed", "milestone",
    (v) => ({ title: `Questbearer ${v}`, description: `Complete ${v} quests.` }),
    [
      { value: 10, rarity: "COMMON" },
      { value: 50, rarity: "RARE" },
      { value: 150, rarity: "EPIC" },
      { value: 400, rarity: "LEGENDARY" },
      { value: 1000, rarity: "MYTHIC" },
    ]),

  // ── Levels ──
  ...ladder("level", "level",
    (v) => ({ title: `Rank Up ${v}`, description: `Reach Level ${v}.` }),
    [
      { value: 10, rarity: "COMMON" },
      { value: 20, rarity: "RARE" },
      { value: 35, rarity: "EPIC" },
      { value: 50, rarity: "EPIC", titleKey: "the-ascendant" },
      { value: 70, rarity: "LEGENDARY" },
      { value: 90, rarity: "LEGENDARY" },
      { value: 100, rarity: "MYTHIC", titleKey: "the-sovereign" },
    ]),

  // ── DSA ──
  ...ladder("dsa_solved", "study",
    (v) => ({ title: v >= 500 ? "Algorithm Overlord" : "Algorithm Hunter", description: `Solve ${v} DSA problems.` }),
    [
      { value: 25, rarity: "COMMON" },
      { value: 100, rarity: "RARE" },
      { value: 250, rarity: "EPIC" },
      { value: 500, rarity: "LEGENDARY", titleKey: "algorithm-slayer" },
      { value: 1000, rarity: "MYTHIC" },
    ]),

  // ── Deep work sessions ──
  ...ladder("focus_sessions", "focus",
    (v) => ({ title: `Deep Diver ${v}`, description: `Complete ${v} deep work sessions.` }),
    [
      { value: 10, rarity: "COMMON" },
      { value: 50, rarity: "RARE", titleKey: "focus-hunter" },
      { value: 150, rarity: "EPIC" },
      { value: 400, rarity: "LEGENDARY", titleKey: "deep-work-master" },
    ]),

  // ── Focus minutes ──
  ...ladder("focus_minutes", "focus",
    (v) => ({ title: `${v / 60 | 0}h of Focus`, description: `Accumulate ${v} minutes of deep focus.` }),
    [
      { value: 600, rarity: "COMMON" },
      { value: 3000, rarity: "RARE" },
      { value: 9000, rarity: "EPIC" },
      { value: 24000, rarity: "LEGENDARY" },
    ]),

  // ── GATE study minutes ──
  ...ladder("gate_minutes", "study",
    (v) => ({ title: `GATE Grinder ${v / 60 | 0}h`, description: `Log ${v / 60 | 0} hours of GATE study.` }),
    [
      { value: 600, rarity: "COMMON" },
      { value: 3000, rarity: "RARE" },
      { value: 12000, rarity: "EPIC" },
      { value: 30000, rarity: "LEGENDARY" },
    ]),

  // ── PYQs ──
  ...ladder("pyq_solved", "study",
    (v) => ({ title: v >= 500 ? "PYQ Conqueror" : "PYQ Warrior", description: `Solve ${v} previous-year questions.` }),
    [
      { value: 50, rarity: "COMMON" },
      { value: 200, rarity: "RARE" },
      { value: 500, rarity: "EPIC", titleKey: "gate-challenger" },
      { value: 1000, rarity: "LEGENDARY" },
    ]),

  // ── Workouts ──
  ...ladder("workout_count", "fitness",
    (v) => ({ title: `Iron Body ${v}`, description: `Complete ${v} workouts.` }),
    [
      { value: 10, rarity: "COMMON" },
      { value: 30, rarity: "RARE", titleKey: "iron-will" },
      { value: 100, rarity: "EPIC" },
      { value: 250, rarity: "LEGENDARY" },
    ]),

  // ── Running distance ──
  ...ladder("run_km_total", "fitness",
    (v) => ({ title: `Distance ${v}km`, description: `Run or walk ${v} km total.` }),
    [
      { value: 25, rarity: "COMMON" },
      { value: 100, rarity: "RARE" },
      { value: 300, rarity: "EPIC" },
      { value: 1000, rarity: "LEGENDARY" },
    ]),

  // ── No-reels streak ──
  ...ladder("no_reels_streak", "discipline",
    (v) => ({ title: v >= 30 ? "Digital Silence" : `Signal Discipline ${v}`, description: `${v} consecutive days without reels or shorts.` }),
    [
      { value: 3, rarity: "COMMON" },
      { value: 7, rarity: "RARE" },
      { value: 30, rarity: "EPIC", titleKey: "digital-silence" },
      { value: 90, rarity: "LEGENDARY" },
    ]),

  // ── Porn-free streak ──
  ...ladder("porn_free_streak", "discipline",
    (v) => ({ title: `Clear Mind ${v}`, description: `${v} consecutive clear days.` }),
    [
      { value: 7, rarity: "COMMON" },
      { value: 30, rarity: "RARE" },
      { value: 90, rarity: "EPIC" },
      { value: 180, rarity: "LEGENDARY" },
    ]),

  // ── Wake streak ──
  ...ladder("wake_streak", "discipline",
    (v) => ({ title: `Dawnbreaker ${v}`, description: `Wake before target ${v} days straight.` }),
    [
      { value: 7, rarity: "COMMON" },
      { value: 30, rarity: "RARE" },
      { value: 90, rarity: "EPIC" },
      { value: 200, rarity: "LEGENDARY" },
    ]),

  // ── Routine streak ──
  ...ladder("routine_streak", "discipline",
    (v) => ({ title: v >= 30 ? "The Unyielding" : `No Excuses ${v}`, description: `Complete your core routine ${v} days straight.` }),
    [
      { value: 7, rarity: "RARE" },
      { value: 30, rarity: "EPIC", titleKey: "the-unyielding" },
      { value: 100, rarity: "LEGENDARY" },
      { value: 365, rarity: "MYTHIC" },
    ]),

  // ── Deep work streak ──
  ...ladder("deepwork_streak", "focus",
    (v) => ({ title: `Flow State ${v}`, description: `Deep work ${v} days straight.` }),
    [
      { value: 7, rarity: "COMMON" },
      { value: 21, rarity: "RARE" },
      { value: 60, rarity: "EPIC" },
    ]),

  // ── Active days ──
  ...ladder("active_days", "consistency",
    (v) => ({ title: `Present ${v}`, description: `Be active in the System for ${v} days.` }),
    [
      { value: 30, rarity: "COMMON" },
      { value: 100, rarity: "RARE" },
      { value: 200, rarity: "EPIC" },
      { value: 365, rarity: "MYTHIC" },
    ]),

  // ── Bosses defeated ──
  ...ladder("boss_defeated", "boss",
    (v) => ({ title: `Boss Slayer ${v}`, description: `Defeat ${v} bosses.` }),
    [
      { value: 1, rarity: "RARE" },
      { value: 3, rarity: "EPIC" },
      { value: 6, rarity: "LEGENDARY" },
    ]),

  // ── Skills mastered ──
  ...ladder("skill_mastered", "skill",
    (v) => ({ title: `Skill Master ${v}`, description: `Master ${v} skill nodes.` }),
    [
      { value: 1, rarity: "COMMON" },
      { value: 5, rarity: "RARE" },
      { value: 15, rarity: "EPIC" },
      { value: 40, rarity: "LEGENDARY" },
    ]),

  // ── Main quest stages ──
  ...ladder("main_stage_cleared", "milestone",
    (v) => ({ title: `Pathfinder ${v}`, description: `Clear ${v} main-quest stages.` }),
    [
      { value: 1, rarity: "COMMON" },
      { value: 5, rarity: "RARE" },
      { value: 15, rarity: "EPIC" },
      { value: 30, rarity: "LEGENDARY" },
    ]),

  // ── Urges resisted (recovery) ──
  ...ladder("urges_resisted", "recovery",
    (v) => ({ title: `Willpower ${v}`, description: `Resist ${v} urges.` }),
    [
      { value: 5, rarity: "COMMON" },
      { value: 25, rarity: "RARE" },
      { value: 100, rarity: "EPIC" },
    ]),

  // ── Coins earned ──
  ...ladder("coins_earned", "economy",
    (v) => ({ title: `Treasury ${v}`, description: `Earn ${v} coins in total.` }),
    [
      { value: 100, rarity: "COMMON" },
      { value: 500, rarity: "RARE" },
      { value: 2000, rarity: "EPIC" },
    ]),

  // ── Study minutes (all domains) ──
  ...ladder("study_minutes", "study",
    (v) => ({ title: `Scholar ${v / 60 | 0}h`, description: `Log ${v / 60 | 0} total hours of study.` }),
    [
      { value: 1200, rarity: "COMMON" },
      { value: 6000, rarity: "RARE" },
      { value: 18000, rarity: "EPIC" },
      { value: 45000, rarity: "LEGENDARY" },
    ]),

  // ── Steps ──
  ...ladder("steps_total", "fitness",
    (v) => ({ title: `Wanderer ${v / 1000 | 0}k`, description: `Walk ${v} steps in total.` }),
    [
      { value: 100000, rarity: "COMMON" },
      { value: 500000, rarity: "RARE" },
      { value: 2000000, rarity: "EPIC" },
    ]),

  // ── Cardio streak ──
  ...ladder("cardio_streak", "fitness",
    (v) => ({ title: `Runner's High ${v}`, description: `Run or walk ${v} days straight.` }),
    [
      { value: 7, rarity: "COMMON" },
      { value: 30, rarity: "RARE" },
      { value: 90, rarity: "EPIC" },
    ]),

  // ── Sleep routine streak ──
  ...ladder("sleep_streak", "recovery",
    (v) => ({ title: `Well-Rested ${v}`, description: `Hit your sleep target ${v} days straight.` }),
    [
      { value: 7, rarity: "COMMON" },
      { value: 30, rarity: "RARE" },
      { value: 90, rarity: "EPIC" },
    ]),

  // ── Perfect days ──
  ...ladder("perfect_days", "consistency",
    (v) => ({ title: `Flawless ${v}`, description: `Complete every daily quest on ${v} days.` }),
    [
      { value: 1, rarity: "COMMON" },
      { value: 10, rarity: "RARE" },
      { value: 30, rarity: "EPIC", titleKey: "the-consistent" },
      { value: 100, rarity: "LEGENDARY" },
    ]),

  // ── Hidden achievements ──
  { key: "night-owl-reformed", title: "Night Owl, Reformed", description: "Wake before 5:15 AM after a late night.", rarity: "RARE", category: "hidden", metric: "hidden_early_after_late", targetValue: 1, xpReward: 150, coinReward: 10, hidden: true },
  { key: "comeback", title: "The Comeback", description: "Return to a perfect day within 48h of a relapse.", rarity: "EPIC", category: "hidden", metric: "hidden_comeback", targetValue: 1, xpReward: 300, coinReward: 20, hidden: true },
  { key: "monk-mode", title: "Monk Mode", description: "A full day with zero distraction minutes logged.", rarity: "RARE", category: "hidden", metric: "hidden_zero_distraction", targetValue: 1, xpReward: 150, coinReward: 12, hidden: true },
  { key: "triple-threat", title: "Triple Threat", description: "Study, workout, and deep work all in one day.", rarity: "RARE", category: "hidden", metric: "hidden_triple", targetValue: 1, xpReward: 180, coinReward: 12, hidden: true },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;
