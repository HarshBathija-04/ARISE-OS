-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0007 Achievements, Titles, Rewards, Coins
-- ════════════════════════════════════════════════════════════════

-- achievements: global definitions
create table if not exists achievements (
  key               text primary key,
  name              text not null,
  description       text not null,
  rarity            rarity not null,
  metric            text not null,      -- e.g. 'missions_completed'
  threshold         numeric not null,
  unlocks_title_key text,
  coin_reward       int not null default 0,
  sort_order        int not null default 0
);

-- user_achievements
create table if not exists user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null references achievements(key) on delete cascade,
  progress       numeric not null default 0,
  unlocked       boolean not null default false,
  unlocked_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, achievement_key)
);
create index if not exists idx_user_ach_user on user_achievements(user_id, unlocked);

-- titles: global definitions
create table if not exists titles (
  key         text primary key,
  name        text not null,
  description text not null,
  rarity      rarity not null,
  bonus_type  text not null default 'NONE',   -- XP | COIN | NONE
  bonus_value numeric not null default 0 check (bonus_value <= 0.05),
  sort_order  int not null default 0
);

-- user_titles
create table if not exists user_titles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title_key   text not null references titles(key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, title_key)
);
create index if not exists idx_user_titles_user on user_titles(user_id);

-- rewards: player-owned reward vault entries
create table if not exists rewards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  description      text not null default '',
  coin_cost        int not null check (coin_cost >= 0),
  cooldown_hours   int not null default 0,
  purchase_count   int not null default 0,
  last_purchased_at timestamptz,
  is_custom        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_rewards_user on rewards(user_id);

-- reward_purchases
create table if not exists reward_purchases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  reward_id    uuid not null references rewards(id) on delete cascade,
  coin_cost    int not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_reward_purch_user on reward_purchases(user_id, created_at desc);

-- coin_transactions: ledger
create table if not exists coin_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  amount        int not null,             -- +earned / -spent
  reason        coin_reason not null,
  ref_id        uuid,
  balance_after bigint not null check (balance_after >= 0),
  created_at    timestamptz not null default now()
);
create index if not exists idx_coin_tx_user on coin_transactions(user_id, created_at desc);

drop trigger if exists trg_user_ach_updated on user_achievements;
create trigger trg_user_ach_updated before update on user_achievements
  for each row execute function set_updated_at();

drop trigger if exists trg_rewards_updated on rewards;
create trigger trg_rewards_updated before update on rewards
  for each row execute function set_updated_at();
