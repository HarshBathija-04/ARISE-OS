-- ─────────────────────────────────────────────────────────────
-- ARISE//OS — 0007_notifications_alarms.sql
-- Notification & alarm system: push devices, server-side schedule
-- queue, alarm/notification analytics events, notification prefs on
-- user_settings, and the timetable_version resync counter.
--
-- Table rationalization vs. the spec's 7 tables:
--   notification_templates      → code constants (engine/content)
--   notification_preferences    → columns on user_settings
--   alarm_history+alarm_attempts→ alarm_events (attempt = event row)
--   notification_logs           → notification_events
-- ─────────────────────────────────────────────────────────────

-- ── Enums ──
create type push_platform as enum ('ANDROID', 'WEB');
create type scheduled_kind as enum (
  'DAILY_RESET', 'EVENING_REMINDER', 'BLOCK_PRE_REMINDER', 'BLOCK_ALARM', 'CUSTOM');
create type scheduled_status as enum ('PENDING', 'SENT', 'CANCELLED', 'FAILED', 'SUPERSEDED');
create type alarm_event_type as enum (
  'SCHEDULED', 'FIRED', 'DELIVERED', 'CONFIRMED', 'SKIPPED', 'SNOOZED', 'MISSED', 'CANCELLED', 'ERROR');
create type notification_event_type as enum (
  'SENT', 'DELIVERED', 'OPENED', 'ACTION', 'DISMISSED', 'FAILED');

-- Additive values on the existing inbox enum. Allowed inside a
-- transaction on PG 12+ as long as the values aren't USED in the
-- same transaction — this migration only declares them.
alter type notification_type add value if not exists 'DAILY_RESET';
alter type notification_type add value if not exists 'EVENING_REMINDER';
alter type notification_type add value if not exists 'BLOCK_REMINDER';

-- ── Inbox dedupe (idempotent scheduled pushes) ──
alter table notifications add column dedupe_key text;
create unique index uq_notifications_dedupe on notifications (user_id, dedupe_key)
  where dedupe_key is not null;

-- ── push_devices — FCM registration tokens, one row per install ──
create table push_devices (
  id           text primary key default gen_random_uuid()::text,
  user_id      uuid not null references users(id) on delete cascade,
  platform     push_platform not null,
  fcm_token    text not null,
  device_id    text not null,            -- stable install id (Android: prefs uuid; web: localStorage uuid)
  device_name  text not null default '',
  app_version  text not null default '',
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (user_id, device_id)            -- token rotates in place per device
);
create index idx_push_devices_user on push_devices (user_id);
create unique index uq_push_devices_token on push_devices (fcm_token);

-- ── scheduled_notifications — server-side queue (UTC fire times) ──
create table scheduled_notifications (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null references users(id) on delete cascade,
  kind       scheduled_kind not null,
  fire_at    timestamptz not null,
  status     scheduled_status not null default 'PENDING',
  dedupe_key text not null,              -- 'EVENING_REMINDER:2026-07-17', 'BLOCK_PRE:<blockId>:2026-07-17'
  payload    jsonb not null default '{}'::jsonb,
  sent_at    timestamptz,
  error      text,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index idx_sched_notif_due on scheduled_notifications (status, fire_at) where status = 'PENDING';
create index idx_sched_notif_user on scheduled_notifications (user_id, kind, fire_at);

-- ── alarm_events — append-only native-alarm analytics ──
create table alarm_events (
  id             text primary key default gen_random_uuid()::text,
  user_id        uuid not null references users(id) on delete cascade,
  block_id       text references timetable_blocks(id) on delete set null,
  date           date not null,          -- game day the alarm belonged to
  event          alarm_event_type not null,
  attempt        integer not null default 1,   -- 1..repeat_count for FIRED repeats
  snooze_minutes integer,
  skip_reason    text,                   -- Busy / Not feeling well / Already completed / Reschedule / Other:<text>
  response_ms    integer,                -- FIRED → user action latency
  device_id      text not null default '',
  meta           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index idx_alarm_events_user_date on alarm_events (user_id, date);
create index idx_alarm_events_block on alarm_events (block_id, date);

-- ── notification_events — push/reminder delivery analytics ──
create table notification_events (
  id              text primary key default gen_random_uuid()::text,
  user_id         uuid not null references users(id) on delete cascade,
  notification_id text references notifications(id) on delete set null,
  scheduled_id    text references scheduled_notifications(id) on delete set null,
  event           notification_event_type not null,
  action          text,                  -- 'open_dashboard' | 'view_quests' | 'continue' | 'skip_remaining' | 'dismiss' …
  platform        push_platform,
  response_ms     integer,
  device_id       text not null default '',
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index idx_notification_events_user_created on notification_events (user_id, created_at);

-- ── user_settings — merged notification_preferences ──
alter table user_settings
  add column reset_time               text not null default '00:00',   -- 'HH:MM' local
  add column evening_reminder_time    text not null default '23:00',
  add column push_enabled             boolean not null default true,
  add column quest_push_enabled       boolean not null default true,
  add column timetable_alarms_enabled boolean not null default true,
  add column pre_reminder_minutes     integer not null default 5,
  add column alarm_repeat_count       integer not null default 3,
  add column alarm_repeat_gap_sec     integer not null default 120,
  add column auto_start_focus         boolean not null default true,
  add column weekend_alarms           boolean not null default true,
  add column dnd_start                text,                            -- 'HH:MM' or null = off
  add column dnd_end                  text,
  add column alarm_config             jsonb not null default
    '{"sound":"arise_default","volume":0.8,"vibration":true,"snoozeOptions":[5,10,15],"defaultSnooze":5}'::jsonb;

-- ── Resync contract: bumped on every timetable/alarm-pref mutation ──
alter table users add column timetable_version integer not null default 1;

-- ── RLS (mirror 0002: SELECT-own; all writes via service role) ──
alter table push_devices            enable row level security;
alter table scheduled_notifications enable row level security;
alter table alarm_events            enable row level security;
alter table notification_events     enable row level security;
create policy "own push devices"        on push_devices            for select using (user_id = auth.uid());
create policy "own scheduled notifs"    on scheduled_notifications for select using (user_id = auth.uid());
create policy "own alarm events"        on alarm_events            for select using (user_id = auth.uid());
create policy "own notification events" on notification_events     for select using (user_id = auth.uid());

-- ── Realtime: timetable_blocks so foreground clients see web edits ──
alter publication supabase_realtime add table timetable_blocks;
alter table timetable_blocks replica identity full;
