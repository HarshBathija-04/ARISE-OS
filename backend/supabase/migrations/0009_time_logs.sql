-- ─────────────────────────────────────────────────────────────
-- ARISE//OS — 0009_time_logs.sql
-- Time Log module: the "reality" layer over the planned timetable.
-- Users record what they ACTUALLY did in any time period; XP, quests,
-- skill progress, streak validation and analytics read the Time Log
-- as an override of the schedule.
--
-- Tables (per spec):
--   time_logs               — one row per logged activity
--   time_log_tags           — free-form tags per log
--   time_log_attachments    — attachments / screenshots / voice notes
--   time_log_ai_analysis    — Gemini classification result per log
--   time_log_xp             — XP grants attributed to a log (audit)
--   time_log_skill_progress — skill-node units contributed by a log
-- ─────────────────────────────────────────────────────────────

-- ── Enums ──
create type time_log_category as enum (
  'STUDY', 'CODING', 'AIML', 'READING', 'WRITING', 'FITNESS', 'HEALTH',
  'FINANCE', 'BUSINESS', 'PERSONAL', 'ENTERTAINMENT', 'SOCIAL', 'REST');
create type time_log_difficulty as enum ('EASY', 'MEDIUM', 'HARD');
create type time_log_attachment_kind as enum ('FILE', 'SCREENSHOT', 'VOICE_NOTE');

-- ── time_logs — the actual-activity timeline ──
create table time_logs (
  id            text primary key default gen_random_uuid()::text,
  user_id       uuid not null references users(id) on delete cascade,
  -- Game day the log belongs to (00:00 UTC of the local calendar day).
  date          timestamptz not null,
  start_hour    integer not null check (start_hour between 0 and 23),
  start_min     integer not null check (start_min between 0 and 59),
  end_hour      integer not null check (end_hour between 0 and 23),
  end_min       integer not null check (end_min between 0 and 59),
  activity      text not null,
  category      time_log_category not null default 'PERSONAL',
  description   text not null default '',
  notes         text not null default '',
  mood          text not null default '',
  energy_level  integer check (energy_level between 1 and 10),
  location      text not null default '',
  -- Overlapping planned block (if any) at creation time — the block this
  -- log "overrides" for XP/streak/analytics purposes.
  block_id      text references timetable_blocks(id) on delete set null,
  ai_summary    text not null default '',
  xp_awarded    integer not null default 0,
  skill_xp      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_time_logs_user_date on time_logs (user_id, date);
create trigger trg_time_logs_updated before update on time_logs
  for each row execute function set_updated_at();

-- ── time_log_tags ──
create table time_log_tags (
  id          text primary key default gen_random_uuid()::text,
  time_log_id text not null references time_logs(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  tag         text not null,
  unique (time_log_id, tag)
);
create index idx_time_log_tags_user on time_log_tags (user_id, tag);

-- ── time_log_attachments — URLs into Supabase Storage ──
create table time_log_attachments (
  id          text primary key default gen_random_uuid()::text,
  time_log_id text not null references time_logs(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  kind        time_log_attachment_kind not null default 'FILE',
  url         text not null,
  name        text not null default '',
  created_at  timestamptz not null default now()
);
create index idx_time_log_attachments_log on time_log_attachments (time_log_id);

-- ── time_log_ai_analysis — one classification per log (re-analysis upserts) ──
create table time_log_ai_analysis (
  id                 text primary key default gen_random_uuid()::text,
  time_log_id        text not null unique references time_logs(id) on delete cascade,
  user_id            uuid not null references users(id) on delete cascade,
  provider           text not null default 'heuristic',           -- gemini | heuristic
  category           time_log_category not null,
  difficulty         time_log_difficulty not null default 'MEDIUM',
  productivity_score integer not null default 0 check (productivity_score between 0 and 100),
  focus_score        integer not null default 0 check (focus_score between 0 and 100),
  suggested_skill    text not null default '',                    -- skill tree key
  xp_multiplier      double precision not null default 1,
  is_productive      boolean not null default false,
  is_deep_work       boolean not null default false,
  contributes_quest  boolean not null default false,
  suggest_new_quest  boolean not null default false,
  insights           text not null default '',                    -- prose suggestions
  raw                jsonb not null default '{}'::jsonb,          -- full model output
  created_at         timestamptz not null default now()
);
create index idx_time_log_ai_user on time_log_ai_analysis (user_id);

-- ── time_log_xp — XP audit rows per log ──
create table time_log_xp (
  id          text primary key default gen_random_uuid()::text,
  time_log_id text not null references time_logs(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  xp_awarded  integer not null default 0,
  coins       integer not null default 0,
  reason      text not null default '',       -- e.g. skipped-block-override, free-time
  created_at  timestamptz not null default now()
);
create index idx_time_log_xp_user on time_log_xp (user_id, created_at);

-- ── time_log_skill_progress — units contributed to skill nodes ──
create table time_log_skill_progress (
  id          text primary key default gen_random_uuid()::text,
  time_log_id text not null references time_logs(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  tree_key    text not null,
  node_id     text references skill_nodes(id) on delete set null,
  units       integer not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_time_log_skill_user on time_log_skill_progress (user_id, created_at);

-- ── RLS: SELECT-only for the owning user (Express service role writes) ──
alter table time_logs               enable row level security;
alter table time_log_tags           enable row level security;
alter table time_log_attachments    enable row level security;
alter table time_log_ai_analysis    enable row level security;
alter table time_log_xp             enable row level security;
alter table time_log_skill_progress enable row level security;

create policy "own time logs"          on time_logs               for select using (user_id = auth.uid());
create policy "own time log tags"      on time_log_tags           for select using (user_id = auth.uid());
create policy "own time log files"     on time_log_attachments    for select using (user_id = auth.uid());
create policy "own time log analysis"  on time_log_ai_analysis    for select using (user_id = auth.uid());
create policy "own time log xp"        on time_log_xp             for select using (user_id = auth.uid());
create policy "own time log skills"    on time_log_skill_progress for select using (user_id = auth.uid());

-- ── Realtime: time_logs changes are cache-invalidation signals ──
alter publication supabase_realtime add table time_logs;
alter table time_logs replica identity full;
