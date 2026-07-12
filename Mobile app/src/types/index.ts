/**
 * SOLO OS — Core domain types.
 * Shared across game engines, stores, services, and UI.
 */

// ── Ranks & Levels ───────────────────────────────────────────────
export type RankName =
  | 'INITIATE'
  | 'AWAKENED'
  | 'VANGUARD'
  | 'ASCENDANT'
  | 'ELITE'
  | 'APEX'
  | 'TRANSCENDENT'
  | 'PARAGON'
  | 'SOVEREIGN';

export interface RankTier {
  name: RankName;
  minLevel: number;
  maxLevel: number;
  color: string;
}

export interface LevelProgress {
  level: number;
  rank: RankName;
  currentXpIntoLevel: number;
  xpForThisLevel: number;
  lifetimeXp: number;
  progress: number; // 0..1 toward next level
  isMax: boolean;
}

// ── Attributes ───────────────────────────────────────────────────
export type AttributeCode =
  | 'STR'
  | 'INT'
  | 'FOC'
  | 'DIS'
  | 'END'
  | 'CON'
  | 'SKL'
  | 'VIT';

export interface AttributeDef {
  code: AttributeCode;
  name: string;
  description: string;
  color: string;
}

export interface AttributeState {
  code: AttributeCode;
  level: number;
  currentXp: number;
  requiredXp: number;
  lifetimeXp: number;
  lastIncreaseAt: string | null;
}

// ── Activities ───────────────────────────────────────────────────
export type ActivityType =
  | 'WORKOUT'
  | 'RUNNING'
  | 'GATE_STUDY'
  | 'DSA'
  | 'AI_ML'
  | 'FULL_STACK'
  | 'SYSTEM_DESIGN'
  | 'DATA_SCIENCE'
  | 'WAKE_5AM'
  | 'DEEP_WORK'
  | 'NO_REELS'
  | 'PORN_FREE'
  | 'ROUTINE_COMPLETION'
  | 'RECOVERY'
  | 'FOCUS_SESSION'
  | 'CUSTOM';

// ── Missions (a.k.a. Quests internally) ─────────────────────────
export type MissionType =
  | 'MAIN'
  | 'DAILY'
  | 'SIDE'
  | 'EMERGENCY'
  | 'RECOVERY'
  | 'BOSS'
  | 'HIDDEN';

export type MissionDifficulty = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';

export type MissionStatus =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export type ObjectiveType =
  | 'BOOLEAN' // done / not done
  | 'DURATION_MINUTES' // e.g. focus 50 min
  | 'COUNT' // e.g. 5 DSA problems
  | 'VALUE'; // arbitrary numeric target

export type VerificationType =
  | 'MANUAL'
  | 'TIMER'
  | 'PROGRESS_VALUE'
  | 'PHOTO'
  | 'HEALTH_DATA';

export interface AttributeReward {
  code: AttributeCode;
  xp: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  difficulty: MissionDifficulty;
  category: string;
  status: MissionStatus;
  objectiveType: ObjectiveType;
  targetValue: number;
  currentProgress: number;
  xpReward: number;
  coinReward: number;
  attributeRewards: AttributeReward[];
  activityType: ActivityType;
  startDate: string | null;
  deadline: string | null;
  completedAt: string | null;
  failureConsequence: string | null;
  verificationType: VerificationType;
  bossId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MissionTemplate {
  templateKey: string;
  title: string;
  description: string;
  type: MissionType;
  difficulty: MissionDifficulty;
  category: string;
  activityType: ActivityType;
  objectiveType: ObjectiveType;
  targetValue: number;
  baseXp: number;
  baseCoins: number;
  attributeRewards: AttributeReward[];
  verificationType: VerificationType;
  failureConsequence: string | null;
}

// ── Focus ────────────────────────────────────────────────────────
export type FocusCategory =
  | 'GATE'
  | 'DSA'
  | 'AI_ML'
  | 'FULL_STACK'
  | 'DATA_SCIENCE'
  | 'SYSTEM_DESIGN'
  | 'PROJECT_WORK';

export type FocusObjectiveResult = 'COMPLETED' | 'PARTIAL' | 'NOT_COMPLETED';

export interface FocusSession {
  id: string;
  category: FocusCategory;
  objective: string;
  plannedMinutes: number;
  activeSeconds: number;
  result: FocusObjectiveResult | null;
  xpAwarded: number;
  startedAt: string;
  endedAt: string | null;
}

// ── Bosses ───────────────────────────────────────────────────────
export type BossStatus = 'LOCKED' | 'ACTIVE' | 'DEFEATED';

export interface Boss {
  id: string;
  name: string;
  description: string;
  maxHp: number;
  currentHp: number;
  phase: number;
  weakness: ActivityType[];
  status: BossStatus;
  battleStartedAt: string | null;
  defeatedAt: string | null;
}

export interface BossLogEntry {
  id: string;
  bossId: string;
  activityType: ActivityType;
  damage: number;
  isCritical: boolean;
  hpAfter: number;
  createdAt: string;
}

// ── Shadow Habits ────────────────────────────────────────────────
export type ShadowHabitCode =
  | 'REELS_SHORTS'
  | 'PORNOGRAPHY'
  | 'MASTURBATION'
  | 'UNPLANNED_GAMING'
  | 'EXCESSIVE_YOUTUBE'
  | 'LATE_NIGHT_PHONE'
  | 'PROCRASTINATION';

export type UrgeResult = 'RESISTED' | 'DELAYED' | 'RELAPSED';

export interface ShadowHabit {
  code: ShadowHabitCode;
  label: string;
  sensitive: boolean;
  currentStreak: number;
  longestStreak: number;
  urgesRecorded: number;
  urgesResisted: number;
  relapseCount: number;
  lastRelapseAt: string | null;
  commonTrigger: string | null;
  riskTime: string | null;
}

export interface UrgeLog {
  id: string;
  habitCode: ShadowHabitCode;
  intensity: number; // 1..10
  trigger: string | null;
  mood: string | null;
  locationCategory: string | null;
  actionTaken: string | null;
  result: UrgeResult;
  createdAt: string;
}

// ── Streaks ──────────────────────────────────────────────────────
export type StreakCode =
  | 'WAKE'
  | 'GATE'
  | 'DSA'
  | 'WORKOUT'
  | 'DEEP_WORK'
  | 'DIGITAL_SILENCE'
  | 'SHADOW_CONTROL'
  | 'ROUTINE';

export interface Streak {
  code: StreakCode;
  label: string;
  currentStreak: number;
  longestStreak: number;
  lastSuccessDate: string | null;
  lastFailureDate: string | null;
  shielded: boolean;
}

// ── Achievements & Titles ────────────────────────────────────────
export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  rarity: Rarity;
  /** Metric key + threshold used by the evaluation engine. */
  metric: string;
  threshold: number;
  unlocksTitleKey?: string;
  coinReward: number;
}

export interface TitleDef {
  key: string;
  name: string;
  description: string;
  rarity: Rarity;
  /** Optional tiny bonus, capped at 0.05 (5%). */
  bonusType?: 'XP' | 'COIN' | 'NONE';
  bonusValue?: number;
}

// ── Rewards / Coins ──────────────────────────────────────────────
export interface Reward {
  id: string;
  name: string;
  description: string;
  coinCost: number;
  cooldownHours: number;
  purchaseCount: number;
  lastPurchasedAt: string | null;
  isCustom: boolean;
}

export type CoinTransactionReason =
  | 'MISSION'
  | 'BOSS'
  | 'ACHIEVEMENT'
  | 'MILESTONE'
  | 'FOCUS'
  | 'PURCHASE'
  | 'ADJUSTMENT';

export interface CoinTransaction {
  id: string;
  amount: number; // positive = earned, negative = spent
  reason: CoinTransactionReason;
  refId: string | null;
  balanceAfter: number;
  createdAt: string;
}

// ── Performance ──────────────────────────────────────────────────
export interface PerformanceScore {
  total: number; // 0..100
  status: string;
  categories: {
    discipline: number;
    knowledge: number;
    physical: number;
    focus: number;
    recovery: number;
  };
}

// ── Player Profile ───────────────────────────────────────────────
export interface PlayerProfile {
  id: string;
  displayName: string;
  level: number;
  rank: RankName;
  lifetimeXp: number;
  coins: number;
  equippedTitleKey: string | null;
  heightCm: number;
  weightKg: number;
  wakeTarget: string; // "05:00"
  sleepTargetHours: number;
  onboardingComplete: boolean;
  privacyMode: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── System events / activity log ─────────────────────────────────
export type SystemEventType =
  | 'MISSION_COMPLETE'
  | 'LEVEL_UP'
  | 'ACHIEVEMENT'
  | 'BOSS_DAMAGE'
  | 'BOSS_DEFEAT'
  | 'STREAK_MILESTONE'
  | 'RECOVERY'
  | 'FOCUS_COMPLETE'
  | 'REWARD'
  | 'SYSTEM';

export interface SystemEvent {
  id: string;
  type: SystemEventType;
  title: string;
  detail: string;
  createdAt: string;
}
