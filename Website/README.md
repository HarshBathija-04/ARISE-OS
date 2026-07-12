# ASCEND//SYSTEM

> **ASCENSION OS** — a personal real-life RPG progression operating system.
> Codename: *Ascendant Protocol*. Built for one player: **Harsh Bathija**.

Turn real actions — study, DSA, workouts, deep work, waking at 5 AM, resisting
distraction — into **XP, levels, ranks, attributes, streaks, quests, boss
battles, achievements, titles, and coins**. Not a habit tracker: a full
progression game wrapped around your real life.

The loop: **PLAN → RECEIVE QUEST → EXECUTE → SUBMIT → VERIFY → EARN XP → LEVEL UP → UNLOCK.**

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) · React 19 · TypeScript |
| UI | Tailwind CSS · Framer Motion · Recharts · Lucide |
| Auth | NextAuth v5 (Credentials, JWT sessions) |
| DB / ORM | PostgreSQL · Prisma 6 |
| AI Guide | Provider abstraction — `local` (no key), `anthropic`, `openai`, `gemini` |
| Validation / State | Zod · Zustand (only where global client state is real) |

All XP, coins, level-ups, and rewards are computed **server-side** in
`src/lib/game-engine/` — the client never sends trusted XP values.

---

## Run it locally

### 1. Prerequisites
- Node 18+ and npm
- A PostgreSQL database URL. Easiest zero-install option: a free
  [Neon](https://neon.tech) or [Supabase](https://supabase.com) project — create
  it in the browser and copy the connection string.

### 2. Configure
```bash
cp .env.example .env
```
Fill in `.env`:
- `DATABASE_URL` / `DIRECT_URL` — your Postgres URL (locally, set both the same).
- `AUTH_SECRET` — generate with `npx auth secret` or `openssl rand -base64 32`.
- `PLAYER_NAME` / `PLAYER_EMAIL` / `PLAYER_PASSWORD` — your login + seed identity.

### 3. Create schema + seed your player
```bash
npm install
npm run db:push     # create all tables on your database
npm run db:seed     # seed player, main quests, skill trees, habits, today's quests
```

### 4. Launch
```bash
npm run dev
```
Open **http://localhost:3000**, watch the boot sequence, and log in with the
`PLAYER_EMAIL` / `PLAYER_PASSWORD` from your `.env`.

> ⚠️ Change `PLAYER_PASSWORD` after first login (default is a placeholder).

---

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm run start` | Serve the production build |
| `npm run db:push` | Sync Prisma schema → database |
| `npm run db:seed` | Seed player + global content |
| `npm run db:studio` | Prisma Studio (inspect data) |
| `npm run db:reset` | **Wipe** and re-seed (destructive) |

---

## What's inside

**Game engines** (`src/lib/game-engine/`)
- `xp-engine.ts` — XP curve `floor(100 × L^1.5)` (~2.06M XP → Level 100 = *Sovereign*,
  a multi-year climb), difficulty multipliers, streak bonuses, daily soft cap +
  diminishing returns (anti-farming).
- `performance-engine.ts` — Life Performance Score (0–100) from Discipline 25 /
  Knowledge 25 / Physical 20 / Focus 20 / Recovery 10, on 7-day + 30-day rolling
  averages so one bad day can't crater it.
- `quest-engine.ts` — adaptive daily quest generation (completion rate, weakest
  attribute, failing streaks, distraction trend, available time, recovery status).
- `ranks.ts`, `attributes.ts`, `service.ts`, `service-extra.ts` — ranks, 8 core
  attributes (STR/INT/FOC/DIS/END/CON/SKL/VIT), boss damage, achievements, titles,
  streak shields, recovery quests.

**Content** (`src/lib/game-engine/content/`) — 17 quest templates, 107 achievements,
titles, 7 skill trees, 5 main-quest chains (GATE, AI Engineer, Full Stack, DSA,
Physical), 6 bosses, default reward shop.

**Screens** (23) — Boot, Login, Dashboard, Daily Quests, Main Quests, Focus Mode,
Attributes, Skill Trees, Boss Battles, Achievements, Titles, Streaks, Shadow Habits,
Recovery Center, Reward Shop, Analytics, Weekly Report, AI Guide, Calendar,
Activity History, Settings.

**AI Guide** (`src/lib/ai/`) — data-driven, non-generic analysis. Defaults to a
deterministic local analyzer (no API key). Set `AI_PROVIDER` + `AI_API_KEY` to use
a hosted model.

---

## Deploy (Vercel)
1. Push this repo to GitHub.
2. Import into [Vercel](https://vercel.com). Framework preset: **Next.js**.
3. Add env vars from `.env` (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`,
   `PLAYER_*`, optional `AI_*`). Use your Neon/Supabase **pooled** URL for
   `DATABASE_URL` and the **direct** URL for `DIRECT_URL`.
4. First deploy, then run `npm run db:push && npm run db:seed` against the same
   database (locally or via a one-off job).
5. Visit your deployment and log in.

The build command already runs `prisma generate`.

---

## Design principles
- **Recovery over punishment.** A relapse never resets your level or deletes
  history — it spawns a Recovery Quest. Penalties are bonus-XP reductions, boss HP
  recovery, and streak risk only.
- **No shame language** in the Shadow Habits system — pattern recognition and
  discipline, not guilt.
- **Server-authoritative.** XP, coins, and level-ups are computed and persisted on
  the server; the client is never trusted with reward values.
