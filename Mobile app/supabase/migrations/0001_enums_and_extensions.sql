-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0001 Enums & Extensions
-- ════════════════════════════════════════════════════════════════
create extension if not exists "pgcrypto";

-- Ranks
do $$ begin
  create type rank_name as enum (
    'INITIATE','AWAKENED','VANGUARD','ASCENDANT','ELITE',
    'APEX','TRANSCENDENT','PARAGON','SOVEREIGN'
  );
exception when duplicate_object then null; end $$;

-- Attribute codes
do $$ begin
  create type attribute_code as enum (
    'STR','INT','FOC','DIS','END','CON','SKL','VIT'
  );
exception when duplicate_object then null; end $$;

-- Activity types
do $$ begin
  create type activity_type as enum (
    'WORKOUT','RUNNING','GATE_STUDY','DSA','AI_ML','FULL_STACK',
    'SYSTEM_DESIGN','DATA_SCIENCE','WAKE_5AM','DEEP_WORK','NO_REELS',
    'PORN_FREE','ROUTINE_COMPLETION','RECOVERY','FOCUS_SESSION','CUSTOM'
  );
exception when duplicate_object then null; end $$;

-- Missions
do $$ begin
  create type mission_type as enum (
    'MAIN','DAILY','SIDE','EMERGENCY','RECOVERY','BOSS','HIDDEN'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type mission_difficulty as enum ('E','D','C','B','A','S','SS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mission_status as enum (
    'LOCKED','AVAILABLE','ACTIVE','COMPLETED','FAILED','EXPIRED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type objective_type as enum (
    'BOOLEAN','DURATION_MINUTES','COUNT','VALUE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_type as enum (
    'MANUAL','TIMER','PROGRESS_VALUE','PHOTO','HEALTH_DATA'
  );
exception when duplicate_object then null; end $$;

-- Focus
do $$ begin
  create type focus_category as enum (
    'GATE','DSA','AI_ML','FULL_STACK','DATA_SCIENCE','SYSTEM_DESIGN','PROJECT_WORK'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type focus_result as enum ('COMPLETED','PARTIAL','NOT_COMPLETED');
exception when duplicate_object then null; end $$;

-- Bosses
do $$ begin
  create type boss_status as enum ('LOCKED','ACTIVE','DEFEATED');
exception when duplicate_object then null; end $$;

-- Campaign / skill nodes
do $$ begin
  create type node_status as enum ('LOCKED','AVAILABLE','ACTIVE','MASTERED');
exception when duplicate_object then null; end $$;

-- Shadow habits
do $$ begin
  create type shadow_habit_code as enum (
    'REELS_SHORTS','PORNOGRAPHY','MASTURBATION','UNPLANNED_GAMING',
    'EXCESSIVE_YOUTUBE','LATE_NIGHT_PHONE','PROCRASTINATION'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type urge_result as enum ('RESISTED','DELAYED','RELAPSED');
exception when duplicate_object then null; end $$;

-- Streaks
do $$ begin
  create type streak_code as enum (
    'WAKE','GATE','DSA','WORKOUT','DEEP_WORK','DIGITAL_SILENCE','SHADOW_CONTROL','ROUTINE'
  );
exception when duplicate_object then null; end $$;

-- Rarity
do $$ begin
  create type rarity as enum ('COMMON','RARE','EPIC','LEGENDARY','MYTHIC');
exception when duplicate_object then null; end $$;

-- Coin transaction reasons
do $$ begin
  create type coin_reason as enum (
    'MISSION','BOSS','ACHIEVEMENT','MILESTONE','FOCUS','PURCHASE','ADJUSTMENT'
  );
exception when duplicate_object then null; end $$;

-- System events
do $$ begin
  create type system_event_type as enum (
    'MISSION_COMPLETE','LEVEL_UP','ACHIEVEMENT','BOSS_DAMAGE','BOSS_DEFEAT',
    'STREAK_MILESTONE','RECOVERY','FOCUS_COMPLETE','REWARD','SYSTEM'
  );
exception when duplicate_object then null; end $$;

-- ── Shared trigger to maintain updated_at ────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
