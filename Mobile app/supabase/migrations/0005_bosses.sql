-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0005 Bosses
-- ════════════════════════════════════════════════════════════════

-- bosses: global boss definitions (templates)
create table if not exists bosses (
  id           text primary key,          -- slug
  name         text not null,
  description  text not null,
  max_hp       int not null check (max_hp > 0),
  weakness     activity_type[] not null default '{}',
  phase_count  int not null default 3,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- boss_encounters: per-player boss state
create table if not exists boss_encounters (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  boss_id            text not null references bosses(id) on delete cascade,
  max_hp             int not null check (max_hp > 0),
  current_hp         int not null check (current_hp >= 0),
  phase              int not null default 1,
  status             boss_status not null default 'ACTIVE',
  battle_started_at  timestamptz not null default now(),
  defeated_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, boss_id),
  constraint hp_within_max check (current_hp <= max_hp)
);
create index if not exists idx_boss_enc_user on boss_encounters(user_id, status);

-- boss_logs: damage / recovery battle log
create table if not exists boss_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  encounter_id   uuid not null references boss_encounters(id) on delete cascade,
  activity_type  activity_type,
  damage         int not null,             -- negative = boss recovered
  is_critical    boolean not null default false,
  hp_after       int not null check (hp_after >= 0),
  note           text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_boss_logs_enc on boss_logs(encounter_id, created_at desc);

drop trigger if exists trg_boss_enc_updated on boss_encounters;
create trigger trg_boss_enc_updated before update on boss_encounters
  for each row execute function set_updated_at();
