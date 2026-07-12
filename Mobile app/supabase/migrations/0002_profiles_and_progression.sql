-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0002 Profiles & Progression
-- ════════════════════════════════════════════════════════════════

-- profiles: 1:1 with auth.users (public identity)
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- player_profiles: the RPG player state
create table if not exists player_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users(id) on delete cascade,
  display_name        text not null default 'PLAYER',
  level               int  not null default 1 check (level between 1 and 100),
  rank                rank_name not null default 'INITIATE',
  lifetime_xp         bigint not null default 0 check (lifetime_xp >= 0),
  coins               bigint not null default 0 check (coins >= 0),
  equipped_title_key  text,
  height_cm           numeric(5,1) not null default 188.0,
  weight_kg           numeric(5,1) not null default 75.0,
  wake_target         text not null default '05:00',
  sleep_target_hours  numeric(3,1) not null default 6.0,
  onboarding_complete boolean not null default false,
  privacy_mode        boolean not null default false,
  difficulty_config   jsonb not null default '{"intensity":"normal"}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_player_profiles_user on player_profiles(user_id);

-- player_levels: static level table (global, read-only reference)
create table if not exists player_levels (
  level          int primary key check (level between 1 and 100),
  xp_required    bigint not null,        -- xp needed to go from (level) -> (level+1)
  cumulative_xp  bigint not null,        -- total lifetime xp to reach this level
  rank           rank_name not null
);

-- attributes: 8 rows per player
create table if not exists attributes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  code              attribute_code not null,
  level             int not null default 1 check (level >= 1),
  current_xp        int not null default 0 check (current_xp >= 0),
  required_xp       int not null default 100 check (required_xp > 0),
  lifetime_xp       bigint not null default 0 check (lifetime_xp >= 0),
  last_increase_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, code)
);
create index if not exists idx_attributes_user on attributes(user_id);

-- attribute_history: time series of attribute XP gains
create table if not exists attribute_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  code          attribute_code not null,
  xp_delta      int not null,
  source        activity_type,
  ref_id        uuid,
  created_at    timestamptz not null default now()
);
create index if not exists idx_attr_hist_user_code_time
  on attribute_history(user_id, code, created_at desc);

drop trigger if exists trg_player_profiles_updated on player_profiles;
create trigger trg_player_profiles_updated before update on player_profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_attributes_updated on attributes;
create trigger trg_attributes_updated before update on attributes
  for each row execute function set_updated_at();
