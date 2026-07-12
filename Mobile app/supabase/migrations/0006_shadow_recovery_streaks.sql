-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0006 Shadow Habits, Recovery, Streaks
-- ════════════════════════════════════════════════════════════════

-- shadow_habits: per-player private habit state
create table if not exists shadow_habits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  code             shadow_habit_code not null,
  sensitive        boolean not null default false,
  current_streak   int not null default 0 check (current_streak >= 0),
  longest_streak   int not null default 0 check (longest_streak >= 0),
  urges_recorded   int not null default 0,
  urges_resisted   int not null default 0,
  relapse_count    int not null default 0,
  last_relapse_at  timestamptz,
  common_trigger   text,
  risk_time        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, code)
);
create index if not exists idx_shadow_user on shadow_habits(user_id);

-- shadow_habit_logs: daily controlled/relapsed record
create table if not exists shadow_habit_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  code         shadow_habit_code not null,
  for_date     date not null default (now() at time zone 'utc')::date,
  controlled   boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (user_id, code, for_date)
);
create index if not exists idx_shadow_logs_user on shadow_habit_logs(user_id, for_date desc);

-- urge_logs
create table if not exists urge_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  code              shadow_habit_code not null,
  intensity         int not null check (intensity between 1 and 10),
  trigger           text,
  mood              text,
  location_category text,
  action_taken      text,
  result            urge_result not null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_urge_logs_user on urge_logs(user_id, created_at desc);

-- recovery_missions
create table if not exists recovery_missions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  triggered_by   shadow_habit_code,
  urge_log_id    uuid references urge_logs(id) on delete set null,
  objectives     jsonb not null default '[]'::jsonb, -- [{text,done}]
  status         mission_status not null default 'ACTIVE',
  xp_awarded     int not null default 0,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_recovery_user on recovery_missions(user_id, created_at desc);

-- streaks
create table if not exists streaks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  code              streak_code not null,
  current_streak    int not null default 0 check (current_streak >= 0),
  longest_streak    int not null default 0 check (longest_streak >= 0),
  last_success_date date,
  last_failure_date date,
  shielded          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, code)
);
create index if not exists idx_streaks_user on streaks(user_id);

-- streak_shields
create table if not exists streak_shields (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  earned_at   timestamptz not null default now(),
  consumed    boolean not null default false,
  consumed_at timestamptz,
  consumed_streak streak_code
);
create index if not exists idx_shields_user on streak_shields(user_id, consumed);

drop trigger if exists trg_shadow_updated on shadow_habits;
create trigger trg_shadow_updated before update on shadow_habits
  for each row execute function set_updated_at();

drop trigger if exists trg_recovery_updated on recovery_missions;
create trigger trg_recovery_updated before update on recovery_missions
  for each row execute function set_updated_at();

drop trigger if exists trg_streaks_updated on streaks;
create trigger trg_streaks_updated before update on streaks
  for each row execute function set_updated_at();
