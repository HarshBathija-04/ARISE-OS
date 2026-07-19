/**
 * Shared string-literal union types matching the Postgres enums 1:1
 * (replaces the @prisma/client generated enum types).
 */

export type QuestType = "MAIN" | "DAILY" | "SIDE" | "EMERGENCY" | "RECOVERY" | "BOSS" | "HIDDEN";
export type Difficulty = "E" | "D" | "C" | "B" | "A" | "S" | "SS";
export type QuestStatus = "ACTIVE" | "COMPLETED" | "PARTIAL" | "FAILED" | "EXPIRED";
export type AttributeKey = "STR" | "INT" | "FOC" | "DIS" | "END" | "CON" | "SKL" | "VIT";
export type SkillStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "MASTERED";
export type HabitKind = "BUILD" | "SHADOW";
export type HabitLogResult = "DONE" | "MISSED" | "CLEAN" | "RELAPSE";
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
export type BossStatus = "LOCKED" | "ACTIVE" | "DEFEATED";
export type FocusCategory =
  | "GATE"
  | "DSA"
  | "AIML"
  | "FULLSTACK"
  | "DATASCIENCE"
  | "SYSTEMDESIGN"
  | "PROJECT";
export type FocusResult = "COMPLETE" | "PARTIAL" | "ABANDONED";
export type CoinReason =
  | "QUEST"
  | "FOCUS"
  | "ACHIEVEMENT"
  | "BOSS"
  | "STREAK"
  | "PENALTY"
  | "PURCHASE"
  | "MANUAL";
export type NotificationType =
  | "QUEST_GENERATED"
  | "QUEST_COMPLETED"
  | "LEVEL_UP"
  | "ATTRIBUTE_UP"
  | "TITLE_ACQUIRED"
  | "BOSS_ENCOUNTER"
  | "BOSS_DEFEATED"
  | "STREAK_AT_RISK"
  | "RECOVERY_ACTIVATED"
  | "ACHIEVEMENT_UNLOCKED"
  | "DAILY_RESET"
  | "EVENING_REMINDER"
  | "BLOCK_REMINDER"
  | "SYSTEM";
export type ReportType = "DAILY" | "WEEKLY";
export type TimetableCategory =
  | "STUDY"
  | "EXERCISE"
  | "MORNING_ROUTINE"
  | "BATH"
  | "BREAKFAST"
  | "LUNCH"
  | "DINNER"
  | "GAMING"
  | "BREAK"
  | "SLEEP"
  | "WORK"
  | "COMMUTE"
  | "NETWORKING";
export type TimetableState =
  | "UPCOMING"
  | "ACTIVE"
  | "COMPLETED"
  | "MISSED"
  | "SKIPPED"
  | "PAUSED"
  | "LATE"
  | "FINISHED_EARLY"
  | "EXCUSED";
export type TimetableDayType = "ALL" | "OFFICE" | "WFH" | "WEEKEND";
export type TimeLogCategory =
  | "STUDY"
  | "CODING"
  | "AIML"
  | "READING"
  | "WRITING"
  | "FITNESS"
  | "HEALTH"
  | "FINANCE"
  | "BUSINESS"
  | "PERSONAL"
  | "ENTERTAINMENT"
  | "SOCIAL"
  | "REST";
export type TimeLogDifficulty = "EASY" | "MEDIUM" | "HARD";
export type TimeLogAttachmentKind = "FILE" | "SCREENSHOT" | "VOICE_NOTE";
export type PushPlatform = "ANDROID" | "WEB";
export type ScheduledKind =
  | "DAILY_RESET"
  | "EVENING_REMINDER"
  | "BLOCK_PRE_REMINDER"
  | "BLOCK_ALARM"
  | "CUSTOM";
export type ScheduledStatus = "PENDING" | "SENT" | "CANCELLED" | "FAILED" | "SUPERSEDED";
export type AlarmEventType =
  | "SCHEDULED"
  | "FIRED"
  | "DELIVERED"
  | "CONFIRMED"
  | "SKIPPED"
  | "SNOOZED"
  | "MISSED"
  | "CANCELLED"
  | "ERROR";
export type NotificationEventType =
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "ACTION"
  | "DISMISSED"
  | "FAILED";

export type AttrMap = Partial<Record<AttributeKey, number>>;

// ─────────────────── Row shapes (snake_case, as returned by supabase-js) ───────────────────

export interface PlayerProfileRow {
  id: string;
  user_id: string;
  display_name: string;
  level: number;
  total_xp: number;
  current_xp: number;
  rank: string;
  coins: number;
  active_days: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  discipline_score: number;
  knowledge_score: number;
  physical_score: number;
  focus_score: number;
  recovery_score: number;
  life_score: number;
  equipped_title_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttributeRow {
  id: string;
  user_id: string;
  key: AttributeKey;
  level: number;
  xp: number;
  total_xp: number;
  updated_at: string;
}

export interface QuestRow {
  id: string;
  user_id: string;
  template_id: string | null;
  title: string;
  description: string;
  type: QuestType;
  difficulty: Difficulty;
  category: string;
  est_minutes: number;
  base_xp: number;
  attribute_xp: AttrMap;
  coin_reward: number;
  streak_key: string | null;
  failure_note: string;
  status: QuestStatus;
  assigned_date: string;
  deadline: string | null;
  main_quest_stage_id: string | null;
  /** Progress units logged on main_quest_stage_id when this quest completes. */
  stage_units: number;
  boss_battle_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestCompletionRow {
  id: string;
  user_id: string;
  quest_id: string;
  result: QuestStatus;
  xp_awarded: number;
  coins_awarded: number;
  attribute_xp: AttrMap;
  quality_ratio: number;
  note: string;
  completed_at: string;
}

export interface StreakRow {
  id: string;
  user_id: string;
  key: string;
  title: string;
  current: number;
  longest: number;
  last_date: string | null;
  shields_used: number;
  updated_at: string;
}

export interface FocusSessionRow {
  id: string;
  user_id: string;
  category: FocusCategory;
  planned_min: number;
  actual_min: number;
  started_at: string;
  ended_at: string | null;
  result: FocusResult | null;
  xp_awarded: number;
  quest_id: string | null;
  note: string;
}

export interface TimetableBlockRow {
  id: string;
  user_id: string;
  order: number;
  start_hour: number;
  start_min: number;
  end_hour: number;
  end_min: number;
  activity: string;
  category: TimetableCategory;
  xp_reward: number;
  day_type: TimetableDayType;
  created_at: string;
  updated_at: string;
}

export interface TimeLogRow {
  id: string;
  user_id: string;
  date: string;
  start_hour: number;
  start_min: number;
  end_hour: number;
  end_min: number;
  activity: string;
  category: TimeLogCategory;
  description: string;
  notes: string;
  mood: string;
  energy_level: number | null;
  location: string;
  block_id: string | null;
  ai_summary: string;
  xp_awarded: number;
  skill_xp: number;
  created_at: string;
  updated_at: string;
}

export interface TimeLogAiAnalysisRow {
  id: string;
  time_log_id: string;
  user_id: string;
  provider: string;
  category: TimeLogCategory;
  difficulty: TimeLogDifficulty;
  productivity_score: number;
  focus_score: number;
  suggested_skill: string;
  xp_multiplier: number;
  is_productive: boolean;
  is_deep_work: boolean;
  contributes_quest: boolean;
  suggest_new_quest: boolean;
  insights: string;
  raw: Record<string, unknown>;
  created_at: string;
}

export interface HabitRow {
  id: string;
  user_id: string;
  key: string;
  title: string;
  kind: HabitKind;
  streak_key: string | null;
  private: boolean;
  active: boolean;
  created_at: string;
}

export interface AlarmConfig {
  sound: string;
  volume: number;
  vibration: boolean;
  snoozeOptions: number[];
  defaultSnooze: number;
}

export interface UserSettingsRow {
  id: string;
  user_id: string;
  wake_target: string;
  sleep_target: string;
  min_sleep_hours: number;
  daily_xp_soft_cap: number;
  difficulty_bias: number;
  ai_provider: string;
  ai_model: string;
  theme: string;
  reduce_motion: boolean;
  timezone: string;
  reset_time: string;
  evening_reminder_time: string;
  push_enabled: boolean;
  quest_push_enabled: boolean;
  timetable_alarms_enabled: boolean;
  pre_reminder_minutes: number;
  alarm_repeat_count: number;
  alarm_repeat_gap_sec: number;
  auto_start_focus: boolean;
  weekend_alarms: boolean;
  dnd_start: string | null;
  dnd_end: string | null;
  alarm_config: AlarmConfig;
  updated_at: string;
}

export interface PushDeviceRow {
  id: string;
  user_id: string;
  platform: PushPlatform;
  fcm_token: string;
  device_id: string;
  device_name: string;
  app_version: string;
  last_seen_at: string;
  created_at: string;
}

export interface ScheduledNotificationRow {
  id: string;
  user_id: string;
  kind: ScheduledKind;
  fire_at: string;
  status: ScheduledStatus;
  dedupe_key: string;
  payload: Record<string, unknown>;
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

export interface AlarmEventRow {
  id: string;
  user_id: string;
  block_id: string | null;
  date: string;
  event: AlarmEventType;
  attempt: number;
  snooze_minutes: number | null;
  skip_reason: string | null;
  response_ms: number | null;
  device_id: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface NotificationEventRow {
  id: string;
  user_id: string;
  notification_id: string | null;
  scheduled_id: string | null;
  event: NotificationEventType;
  action: string | null;
  platform: PushPlatform | null;
  response_ms: number | null;
  device_id: string;
  meta: Record<string, unknown>;
  created_at: string;
}
