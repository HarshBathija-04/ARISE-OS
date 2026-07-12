-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0003 Missions
-- ════════════════════════════════════════════════════════════════

-- mission_templates: global catalog (read-only reference)
create table if not exists mission_templates (
  template_key       text primary key,
  title              text not null,
  description        text not null,
  type               mission_type not null,
  difficulty         mission_difficulty not null,
  category           text not null,
  activity_type      activity_type not null,
  objective_type     objective_type not null,
  target_value       numeric not null default 1,
  base_xp            int not null,
  base_coins         int not null default 0,
  attribute_rewards  jsonb not null default '[]'::jsonb, -- [{code,xp}]
  verification_type  verification_type not null default 'MANUAL',
  failure_consequence text,
  created_at         timestamptz not null default now()
);

-- missions: player-owned mission instances
create table if not exists missions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  template_key        text references mission_templates(template_key),
  title               text not null,
  description         text not null,
  type                mission_type not null,
  difficulty          mission_difficulty not null,
  category            text not null,
  status              mission_status not null default 'AVAILABLE',
  objective_type      objective_type not null,
  target_value        numeric not null default 1,
  current_progress    numeric not null default 0 check (current_progress >= 0),
  xp_reward           int not null default 0,
  coin_reward         int not null default 0,
  attribute_rewards   jsonb not null default '[]'::jsonb,
  activity_type       activity_type not null,
  boss_id             uuid,
  start_date          timestamptz,
  deadline            timestamptz,
  completed_at        timestamptz,
  failure_consequence text,
  verification_type   verification_type not null default 'MANUAL',
  for_date            date not null default (now() at time zone 'utc')::date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_missions_user_status on missions(user_id, status);
create index if not exists idx_missions_user_date on missions(user_id, for_date);

-- mission_completions: immutable audit log of validated completions
create table if not exists mission_completions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  mission_id     uuid not null references missions(id) on delete cascade,
  xp_awarded     int not null,
  coins_awarded  int not null,
  attribute_awards jsonb not null default '[]'::jsonb,
  boss_damage    int not null default 0,
  anti_farm_note text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_mission_completions_user on mission_completions(user_id, created_at desc);

drop trigger if exists trg_missions_updated on missions;
create trigger trg_missions_updated before update on missions
  for each row execute function set_updated_at();
