# SOLO OS — Supabase Setup Guide

SOLO OS runs in **local-only mode** with no backend. To enable cloud sync,
server-authoritative progression, and multi-device access, connect Supabase
(free tier is enough).

## 1. Create the project

1. Go to https://supabase.com → **New project** (free tier).
2. Pick a strong database password and a region near you.
3. Wait for provisioning (~2 min).

## 2. Apply the schema

The SQL is split into ordered files under `supabase/migrations/` and
`supabase/seed/`. Apply them **in numerical order**.

### Option A — SQL Editor (no CLI)

Open **SQL Editor** in the dashboard and run each file's contents in order:

```
migrations/0001_enums_and_extensions.sql
migrations/0002_profiles_and_progression.sql
migrations/0003_missions.sql
migrations/0004_campaigns_skills_focus.sql
migrations/0005_bosses.sql
migrations/0006_shadow_recovery_streaks.sql
migrations/0007_achievements_titles_rewards.sql
migrations/0008_reports_logs_settings.sql
migrations/0009_rls_policies.sql
migrations/0010_level_table_and_bootstrap.sql
migrations/0011_progression_rpcs.sql
migrations/0012_boss_reward_rpcs.sql
seed/0100_mission_templates.sql
seed/0101_campaigns_bosses.sql
seed/0102_titles.sql
seed/0103_achievements.sql        # auto-generated; regenerate with: node supabase/seed/generate.ts
```

`seed/0104_default_rewards.sql` and `seed/0105_player_seed.sql` are **per-user**
and are applied automatically by the app on first launch after sign-in.

### Option B — Supabase CLI

```bash
npm i -g supabase
supabase link --project-ref <your-ref>
supabase db push          # if you convert these into CLI migrations
# or, simplest:
supabase db execute --file supabase/migrations/0001_enums_and_extensions.sql
# ...repeat in order
```

## 3. Wire the app

Copy `.env.example` → `.env` and fill:

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

Find these under **Project Settings → API**.

## 4. Create the player

Launch the app, open **Profile → System Link**, and sign up with email +
password. The `on_auth_user_created` trigger provisions:

- `player_profiles` (Level 1, INITIATE)
- 8 `attributes`, 8 `streaks`, 7 `shadow_habits`
- default `notification_preferences`

The app then seeds the default reward vault and Harsh's profile fields
(height 188 cm, weight 75 kg, wake 05:00, 6 h sleep).

## Security model

- **Row Level Security** is on for every table. Players read/write only their
  own rows (`auth.uid() = user_id`).
- Global definitions (`achievements`, `bosses`, `mission_templates`,
  `campaigns`, …) are **read-only** to authenticated users; only the service
  role (migrations) can write them.
- **All progression math is server-side** via `SECURITY DEFINER` RPCs:
  `complete_mission`, `apply_boss_damage`, `purchase_reward`. The client never
  submits XP, coins, or damage values — it submits the *action*, the server
  computes rewards from trusted templates and logs.

## AI (ECHO)

ECHO works offline via `MockAIProvider`. To use a real model later, deploy the
`echo` edge function and set its provider secret **server-side** — never put an
AI key in the client `.env`.
```
```
