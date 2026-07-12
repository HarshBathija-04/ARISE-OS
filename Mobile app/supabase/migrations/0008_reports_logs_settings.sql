-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0008 Reports, Activity Log, Notifications, Settings
-- ════════════════════════════════════════════════════════════════

-- daily_reports (ECHO evening summary)
create table if not exists daily_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  for_date     date not null,
  summary      text not null default '',
  metrics      jsonb not null default '{}'::jsonb,
  performance_score int,
  created_at   timestamptz not null default now(),
  unique (user_id, for_date)
);
create index if not exists idx_daily_reports_user on daily_reports(user_id, for_date desc);

-- weekly_reports (ECHO SYSTEM ANALYSIS REPORT)
create table if not exists weekly_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  week_start    date not null,
  summary       text not null default '',
  metrics       jsonb not null default '{}'::jsonb,
  primary_recommendation text,
  next_week_target text,
  created_at    timestamptz not null default now(),
  unique (user_id, week_start)
);
create index if not exists idx_weekly_reports_user on weekly_reports(user_id, week_start desc);

-- activity_logs: canonical trusted record of every real-world action
-- Boss damage & analytics derive from here.
create table if not exists activity_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  activity_type  activity_type not null,
  quantity       numeric not null default 1,   -- minutes / count / etc
  unit           text not null default 'unit',
  xp_awarded     int not null default 0,
  source_table   text,                          -- 'missions' | 'focus_sessions' | ...
  source_id      uuid,
  for_date       date not null default (now() at time zone 'utc')::date,
  created_at     timestamptz not null default now()
);
create index if not exists idx_activity_user_time on activity_logs(user_id, created_at desc);
create index if not exists idx_activity_user_type_date on activity_logs(user_id, activity_type, for_date);

-- system_notifications: in-app system event feed
create table if not exists system_notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         system_event_type not null,
  title        text not null,
  detail       text not null default '',
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_sys_notif_user on system_notifications(user_id, created_at desc);

-- user_settings
create table if not exists user_settings (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  haptics_enabled    boolean not null default true,
  privacy_mode       boolean not null default false,
  biometric_lock     boolean not null default false,
  theme_intensity    text not null default 'normal',
  ai_provider        text not null default 'mock',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- notification_preferences (per channel)
create table if not exists notification_preferences (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  channel      text not null,   -- DAILY_MISSIONS | STREAK_WARNINGS | FOCUS | RECOVERY | SYSTEM_EVENTS
  enabled      boolean not null default true,
  schedule     text,            -- e.g. '05:00'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, channel)
);
create index if not exists idx_notif_pref_user on notification_preferences(user_id);

drop trigger if exists trg_user_settings_updated on user_settings;
create trigger trg_user_settings_updated before update on user_settings
  for each row execute function set_updated_at();

drop trigger if exists trg_notif_pref_updated on notification_preferences;
create trigger trg_notif_pref_updated before update on notification_preferences
  for each row execute function set_updated_at();
