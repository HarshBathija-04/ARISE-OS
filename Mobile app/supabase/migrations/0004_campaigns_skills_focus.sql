-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0004 Campaigns, Skill Trees, Focus
-- ════════════════════════════════════════════════════════════════

-- campaigns: global definitions (GATE ASCENSION, AI ENGINEER PATH, ...)
create table if not exists campaigns (
  id           text primary key,          -- slug
  name         text not null,
  description  text not null,
  accent       text not null default 'energy',
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- campaign_stages: ordered nodes within a campaign (global)
create table if not exists campaign_stages (
  id           text primary key,          -- slug
  campaign_id  text not null references campaigns(id) on delete cascade,
  name         text not null,
  sort_order   int not null,
  xp_to_master int not null default 500
);
create index if not exists idx_campaign_stages_campaign on campaign_stages(campaign_id, sort_order);

-- campaign_progress: per-player progress on stages
create table if not exists campaign_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  stage_id     text not null references campaign_stages(id) on delete cascade,
  status       node_status not null default 'LOCKED',
  progress_xp  int not null default 0 check (progress_xp >= 0),
  mastered_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, stage_id)
);
create index if not exists idx_campaign_progress_user on campaign_progress(user_id);

-- skill_trees & skill_nodes (Skill Matrix) — global definitions
create table if not exists skill_trees (
  id          text primary key,
  name        text not null,
  description text not null,
  created_at  timestamptz not null default now()
);

create table if not exists skill_nodes (
  id          text primary key,
  tree_id     text not null references skill_trees(id) on delete cascade,
  name        text not null,
  description text not null,
  tier        int not null default 1,
  requires    text[] not null default '{}',  -- prerequisite node ids
  xp_to_unlock int not null default 300,
  sort_order  int not null default 0
);
create index if not exists idx_skill_nodes_tree on skill_nodes(tree_id, tier);

create table if not exists skill_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  node_id     text not null references skill_nodes(id) on delete cascade,
  status      node_status not null default 'LOCKED',
  progress_xp int not null default 0 check (progress_xp >= 0),
  unlocked_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, node_id)
);
create index if not exists idx_skill_progress_user on skill_progress(user_id);

-- focus_sessions
create table if not exists focus_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  category       focus_category not null,
  objective      text not null default '',
  planned_minutes int not null,
  active_seconds int not null default 0 check (active_seconds >= 0),
  result         focus_result,
  xp_awarded     int not null default 0,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_focus_user_time on focus_sessions(user_id, started_at desc);

drop trigger if exists trg_campaign_progress_updated on campaign_progress;
create trigger trg_campaign_progress_updated before update on campaign_progress
  for each row execute function set_updated_at();

drop trigger if exists trg_skill_progress_updated on skill_progress;
create trigger trg_skill_progress_updated before update on skill_progress
  for each row execute function set_updated_at();
