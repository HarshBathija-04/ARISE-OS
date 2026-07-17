# ARISE//OS — Architecture & Deployment

```
┌─────────────┐     ┌─────────────┐
│ Next.js Web │     │ Flutter App │
│  (Website/) │     │  (mobile/)  │
└──────┬──────┘     └──────┬──────┘
       │   REST /v1  (Bearer: Supabase access token)
       ▼                   ▼
┌─────────────────────────────────┐
│   Express API  (backend/)       │   ← ALL game logic (XP, quests, streaks)
│   supabase-js (service role)    │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│  Supabase: Postgres + Auth +    │ ──→ Realtime postgres_changes events
│  Realtime                       │     push "something changed" to clients,
└─────────────────────────────────┘     which refetch via the API
```

**Sync model:** the Express backend is the only writer (service-role key). Clients
have SELECT-only RLS policies, used exclusively by Supabase Realtime. A change made
on the phone lands in Postgres → Realtime notifies the web browser → the web page
refetches → both screens agree within ~1s. No client ever computes game state.

---

## 1. Supabase setup (one-time)

1. Create a Supabase project (or reuse the existing one that hosted the Prisma DB).
2. In **Dashboard → Auth → Settings**, enable email/password sign-in.
   In **Settings → API**, note the URL, anon key, and service-role key.
3. Apply migrations + seed global content (from `backend/`, using the direct
   Postgres connection — no service-role key needed):
   ```bash
   cd backend && npm install
   DIRECT_URL="postgresql://..." npm run migrate       # applies supabase/migrations/0001..0004
   DIRECT_URL="postgresql://..." npm run seed:direct   # titles/achievements/bosses/quest templates
   ```
   (Already done for the current project — both are idempotent and safe to re-run.
   `npm run seed` is the supabase-js equivalent if you have SUPABASE_SERVICE_ROLE_KEY set.)
4. **Migrating an existing player** from the old Prisma tables (same project):
   ```bash
   npm run migrate-data   # creates the auth user (bcrypt hash imported,
                          # old password keeps working) and copies all rows,
                          # rewriting cuid user ids → the new auth uuid
   ```
   Fresh installs skip this — signing up in either client calls
   `POST /v1/account/bootstrap`, which seeds the full starting state.

## 2. Backend (`backend/`)

```bash
cd backend && npm install
npm run dev        # tsx watch, :4000
npm test           # vitest: XP math + quest-engine determinism
```

Deploy on **Railway** (or Render/Fly — needs an always-on process for node-cron):

| Env var | Value |
|---|---|
| `SUPABASE_URL` | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key (server-only, never in clients) |
| `PORT` | 4000 (Railway injects its own) |
| `CRON_ENABLED` | `true` **only on the deployed instance** |
| `INTERNAL_CRON_SECRET` | random string; enables `POST /v1/internal/cron/daily-quests` |
| `CORS_ORIGINS` | `https://your-site.vercel.app,http://localhost:3000` |

Daily quests are **pre-generated for the next day at 12:00 IST** (noon) via
node-cron — written with tomorrow's `assigned_date`, so they unlock when the
game day flips at midnight. A second cron at **00:00 IST** is a safety pass
(no-op when pre-generation ran), and `GET /v1/quests/today` lazily ensures the
set as a final net. Manual triggers: `POST /v1/internal/cron/next-day-quests`
and `POST /v1/internal/cron/daily-quests` (x-internal-secret header).

**Personalized quest engine (since migration 0006):** each day's set is seeded
by (day, user) — different every day, stable within a day, different per user —
and built from the user's own state: 2 **goal quests** synthesized from active
Main Quests (they carry `main_quest_stage_id` + `stage_units`; completing one
auto-advances that stage), up to 2 **routine quests** from today's timetable
variant (office/WFH/weekend aware), and **habit anchors** drawn from the
user's active habits (global templates tied to streaks the user doesn't
pursue are excluded from the pool). Adaptive rules: 3 bad days → lighter set,
7 strong days → one harder challenge, broken pursued streaks → re-entry
quests, distraction spike → focus quests, recovery mode → light day.
`POST /v1/quests/generate` with `{"regenerate": true}` redraws today's
still-active quests (completed ones are kept, never re-issued).
`scripts/regenerate-today.ts [email ...]` does the same server-side.

**Timetable model (since migration 0005):** every block has a `dayType` —
`ALL` (shared, e.g. morning routine), `OFFICE`, `WFH`, or `WEEKEND` — so one
user keeps three schedule variants. `GET /v1/timetable?dayType=OFFICE` returns
ALL+OFFICE blocks plus today's `states` and `excuses` maps. Blocks stay fully
user-editable (`PUT /v1/timetable` with optional `dayType` replaces just one
variant; block CRUD accepts `dayType`). A block missed for a rare valid reason
can be **excused**: `POST /v1/timetable/blocks/:id/state` with
`{state: "EXCUSED", reason}` — awards no XP and is recorded distinctly from
MISSED/SKIPPED. New categories: WORK, COMMUTE, NETWORKING.


## 3. Website (`Website/`)

| Env var | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (RLS-safe: clients can only SELECT their own rows) |
| `API_BASE_URL` | Express URL (server-side fetches) |
| `NEXT_PUBLIC_API_BASE_URL` | Express URL (browser calls, e.g. signup bootstrap) |

`npm run build` — no Prisma step anymore. The old `/api/*` routes and Vercel cron
are gone; remove `CRON_SECRET`/`AUTH_SECRET`/`DATABASE_URL` from Vercel env.

## 4. Flutter app (`mobile/`)

```bash
cd mobile
flutter create . --platforms android,ios   # once, generates platform folders
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon key> \
  --dart-define=API_BASE_URL=http://10.0.2.2:4000   # Android emulator → local backend
```

For a real device against the deployed backend, point `API_BASE_URL` at Railway.

## 5. What was removed

- `Website/prisma/`, `@prisma/client`, NextAuth, bcryptjs — Supabase Auth owns credentials.
- `Website/src/app/api/` — every route is served by Express now.
- The old Expo `Mobile app/` and its snapshot-sync machinery (`GameStateSnapshot`,
  `sync-engine.ts`, `/api/state`, `/api/sync/*`). Both clients are online-first
  against one API, so revision-merge sync no longer exists — by design.
