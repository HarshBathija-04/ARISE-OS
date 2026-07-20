<div align="center">

<img src="Asset/Logo.png" alt="Arise OS Logo" width="120" />

# ARISE OS

### Turn your real life into an RPG.

*Log real actions — study, focus, workouts, habits — and watch your XP, attributes, skills, streaks, and boss battles grow from them automatically. No fantasy stats. No wishful thinking. Just reality, gamified.*

[![Download APK](https://img.shields.io/badge/Android-Download%20APK%20v1.0.1-3DDC84?logo=android&logoColor=white)](https://github.com/HarshBathija-04/ARISE-OS/releases/download/v1.0.1/arise-os-v1.0.1.apk)
[![Web App](https://img.shields.io/badge/Web-arise--os--web.vercel.app-000000?logo=vercel&logoColor=white)](https://arise-os-web.vercel.app)
[![Latest Release](https://img.shields.io/github/v/release/HarshBathija-04/ARISE-OS?label=Latest%20Release&color=blue)](https://github.com/HarshBathija-04/ARISE-OS/releases/latest)

**Flutter · Next.js · Express · Supabase · Gemini AI · Firebase Cloud Messaging**

</div>

---

## 📖 Table of Contents

- [What is Arise OS?](#-what-is-arise-os)
- [Try the Demo](#-try-the-demo)
- [The Core Loop](#-the-core-loop)
- [Feature Overview](#-feature-overview)
- [User Manual](#-user-manual)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started (Development)](#-getting-started-development)
- [Deployment](#-deployment)
- [Testing](#-testing)

---

## 🎮 What is Arise OS?

**Arise OS is a real-life RPG progression operating system.** It's built on one core philosophy:

> You **log real actions** — study sessions, deep-work blocks, workouts, resisted urges — and the game layer (XP, attributes, skill trees, streaks, boss battles) grows from them **automatically**. You almost never edit stats by hand. The system only rewards what actually happened.

It ships as **one shared backend with two frontends**: a Flutter app (Android / Windows / iOS) and a Next.js web dashboard, kept in sync in real time. A change made on your phone appears on the web dashboard within about a second.

The system is honest by design: it tracks the gap between your *planned* day and your *actual* day, treats slips as training data instead of failure, and uses an AI Guide that reports what your data says — never slogans.

---

## 🚀 Try the Demo

Anyone can try Arise OS — no signup needed.

| Platform | Link |
|---|---|
| 📱 **Android APK** | **[⬇ Direct download (v1.0.1)](https://github.com/HarshBathija-04/ARISE-OS/releases/download/v1.0.1/arise-os-v1.0.1.apk)** · [all releases](https://github.com/HarshBathija-04/ARISE-OS/releases/latest) |
| 🌐 **Web dashboard** | **[arise-os-web.vercel.app](https://arise-os-web.vercel.app)** |

**Demo credentials** (both app and website have a tap-to-fill button on the login screen):

```
Email:    demo@arise.os
Password: password123
```

> The demo account is shared and may be reset periodically. On Android, allow *installs from unknown sources* if prompted.

---

## 🔄 The Core Loop

```
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
   │   1. PLAN      Set your recurring schedule once          │
   │      ↓         (office / WFH / weekend variants)         │
   │   2. ACT       Do the real work in real life             │
   │      ↓                                                   │
   │   3. LOG       Check off quests, run focus sessions,     │
   │      ↓         fill the Time Log with what happened      │
   │   4. GROW      XP, attributes, skills, streaks, and      │
   │      ↓         bosses all move — automatically           │
   │   5. REVIEW    Weekly Report + AI Guide read your data   │
   │                and set next week's objective             │
   │                                                          │
   └──────────────────────────────────────────────────────────┘
```

1. **Open the Dashboard** to see your current status and what needs attention today.
2. **Set your recurring plan once** in Timetable → Schedule (office / WFH / weekend variants).
3. **As the day happens, log reality**: check off Daily Quests, run Focus sessions, and fill the Time Log.
4. **Watch the RPG layer respond** — Attributes, Skills, Streaks, and Bosses all move from what you logged.
5. **At week's end**, read the Weekly Report and let The Guide tell you what the data says.

---

## ✨ Feature Overview

| | Feature | Description |
|---|---|---|
| 🎯 | **Personalized Daily Quests** | A fresh quest set every day, generated from *your* state: goal quests from your active Main Quests, routine quests from today's timetable variant, and habit anchors from your active habits. Adaptive: bad days → lighter sets, strong weeks → harder challenges. |
| ⚔️ | **Main Quests** | Major life goals broken into stages. Completing daily goal quests auto-advances the linked stage. |
| ⏱️ | **Focus Mode** | Deep-work timer — focused minutes convert into XP and coins. |
| 📅 | **Smart Timetable** | Three schedule variants (Office / WFH / Weekend) with per-block states, valid-excuse handling, and plan-vs-reality analytics. |
| 📝 | **Time Log + AI** | Log what you *actually* did; Gemini AI classifies each entry, scores productivity, estimates XP, and feeds skill-tree progress. |
| 🧬 | **Attributes** | Six core stats (Discipline, Intellect, Vitality, Focus, Social, Creativity) that level automatically from your logged actions. |
| 🌳 | **Skill Trees** | Branching mastery nodes driven by real logged activity — master a node to unlock the next. |
| 💀 | **Boss Battles** | Multi-day challenges with health bars. Your real actions deal the damage. |
| 🔥 | **Streaks & Shields** | Consecutive perfect days per routine. Every 7 days earns a Shield that absorbs one missed day. |
| 👤 | **Shadow Habits** | Private tracking for habits you're breaking — logs urges resisted, treats slips as data via Recovery mode. |
| 🏆 | **Achievements & Titles** | One-time unlocks (some hidden); equippable titles with XP bonuses. |
| 🪙 | **Reward Shop** | Spend earned coins on real-life rewards, guilt-free. Coins are separate from XP. |
| 🤖 | **The Guide (AI)** | An AI core that reads your entire history and reports what the data says — personalized, never generic. |
| 📊 | **Analytics & Weekly Report** | 30-day trends, a 5-week consistency heatmap, a year-long contribution graph, and an automatic weekly life score. |
| 🔔 | **Native Alarms & Push** | FCM push notifications plus a native Android alarm stack for block reminders. |

---

## 📚 User Manual

A complete interactive field manual ships inside the product — **[arise-os-web.vercel.app/manual](https://arise-os-web.vercel.app/manual)** — plus an AI Guide for personalized onboarding. The essentials:

### The XP System

XP is the core currency of progression — it cannot be spent, it only accumulates to level you up.

- **Daily Quests** grant 10–50 XP based on difficulty
- **Focus Sessions** earn ~1 XP per focused minute
- **Time Log** entries earn XP scaled by duration, difficulty, and AI-scored productivity
- **Main Quest stages** grant 100–500 XP per milestone
- **Boss defeats** award 200–1000 XP
- **Multipliers**: equipped titles (+5–15%), perfect streaks, and combo achievements stack

### The Six Attributes

Every logged action feeds one or more attributes, which level independently (and faster) than your player level:

| Attribute | Fed by |
|---|---|
| **Discipline** | Streaks, resisted urges, habit consistency |
| **Intellect** | Study sessions, reading, skill mastery |
| **Vitality** | Workouts, sleep consistency, recovery |
| **Focus** | Deep-work sessions, distraction-free time |
| **Social** | Relationship quests, social activities |
| **Creativity** | Creative projects, journaling, exploration |

Balanced growth matters — some skill nodes require multiple attributes at specific levels to unlock.

### Timetable Mastery

The Timetable is the command center, split into three tabs:

1. **Schedule** — your ideal recurring plan, with **Office / WFH / Weekend variants** you switch between as your week changes.
2. **Time Log** — reality: what you actually did, logged block by block. Matched blocks earn XP and feed streaks; missed blocks are tracked but not punished. Blocks missed for a rare valid reason can be **excused** (no XP, but recorded distinctly from missed/skipped).
3. **Analytics** — the gap between plan and reality over 30 days. *That gap is data, not failure* — use it to find friction points and unrealistic scheduling.

### Boss Battles

Bosses are multi-day challenges with health bars representing sustained effort toward a major goal (a certification, a skill, a hard project). Every relevant logged action — focus sessions, themed quests, milestone progress — chips away at the boss's health. Some bosses have **phases** that evolve as you damage them. Victory grants massive XP, a unique title, and often new skill-tree branches.

### Streaks & Shields

A streak counts consecutive **perfect days** for a routine (all required blocks completed). Every 7 perfect days earns a **Streak Shield** — insurance that absorbs one missed day so a single slip doesn't reset your chain. You can run independent streaks for different life areas (workout, study, sleep), each with its own shields.

### Shadow Habits & Recovery

Private tracking for habits you're trying to break. When an urge hits and you resist it, **log it — that resistance is a win the system records.** Slipped? **Recovery mode** turns the slip into training data: log what happened and why, commit to a recovery action, and level up your recovery skill. *No shame, just reps — discipline isn't avoiding urges, it's handling them when they arrive.*

### Pro Tips

- **Start small** — build one routine first, get it consistent, then add more. The system rewards depth over breadth.
- **Trust the shields** — they exist so you can miss a day without panic. Use them guilt-free.
- **Log daily** — fill your Time Log every evening. The system can't reward reality if you don't record it.
- **Ask The Guide** — the AI reads your entire history and gives personalized next steps.

---

## 🏗 Architecture

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

**Design principles:**

- **Single writer** — the Express backend owns all game logic and is the *only* writer to the database (service-role key). No client ever computes game state.
- **Realtime as cache invalidation** — clients hold SELECT-only RLS policies used exclusively by Supabase Realtime. A change on the phone lands in Postgres → Realtime notifies the browser → the web page refetches → both screens agree within ~1 s.
- **AI where it earns its place** — Gemini classifies time-log entries and powers The Guide; deterministic engines (seeded per day + user) generate quests so they're reproducible and testable.
- **Scheduled game days** — daily quests are pre-generated for the next day at 12:00 IST via node-cron, unlocking when the game day flips at midnight, with a safety pass and lazy fallback.

**Tech stack:**

| Layer | Technology |
|---|---|
| Mobile | Flutter + Riverpod, native Kotlin alarm stack |
| Web | Next.js (App Router), Tailwind CSS |
| API | Express 5 (TypeScript, ESM), Zod validation, Pino logging |
| Data & Auth | Supabase (Postgres, Auth, Realtime), Row Level Security |
| AI | Google Gemini (time-log classification, The Guide) |
| Push | Firebase Cloud Messaging |
| Scheduling | node-cron (IST game-day boundary) |

---

## 📁 Project Structure

```
Arise-OS/
├── backend/          # Express API — canonical backend, owns all game logic
│   ├── src/
│   │   ├── routes/       # /v1/* REST endpoints (quests, timetable, focus, …)
│   │   └── services/     # XP math, quest engine, streak validation, AI classify, …
│   ├── supabase/
│   │   └── migrations/   # SQL migrations (0001…0009)
│   └── scripts/          # migrate, seed, data-migration utilities
├── Website/          # Next.js web dashboard (+ /manual field guide, AI Guide)
├── mobile/           # Flutter app — Android / Windows / iOS
├── docs/             # Additional docs (notifications setup, …)
└── ARCHITECTURE.md   # Full architecture & deployment reference
```

---

## 🛠 Getting Started (Development)

### Prerequisites

- Node.js 20+, Flutter 3.x, a [Supabase](https://supabase.com) project (free tier works)

### 1. Supabase (one-time)

Enable email/password sign-in in **Auth → Settings**, then note the URL, anon key, and service-role key from **Settings → API**.

```bash
cd backend && npm install
DIRECT_URL="postgresql://..." npm run migrate       # apply supabase/migrations
DIRECT_URL="postgresql://..." npm run seed:direct   # titles/achievements/bosses/templates
```

Both are idempotent and safe to re-run. Fresh installs need nothing else — signing up in either client calls `POST /v1/account/bootstrap`, which seeds the full starting state.

### 2. Backend

```bash
cd backend
npm install
npm run dev               # http://localhost:4000
```

### 3. Website

```bash
cd Website
npm install
npm run dev               # http://localhost:3000
```

### 4. Mobile app

```bash
cd mobile
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<project>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon-key> \
  --dart-define=API_BASE_URL=http://localhost:4000    # Android emulator: http://10.0.2.2:4000
```

**Release APK** (defines come from `mobile/env.release.json`, which is git-ignored):

```bash
flutter build apk --release --dart-define-from-file=env.release.json
```

---

## ☁️ Deployment

| Component | Host | Notes |
|---|---|---|
| Backend | Render / Railway / Fly | Needs an always-on process for node-cron. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_ENABLED=true`, `INTERNAL_CRON_SECRET`, `CORS_ORIGINS`. |
| Website | Vercel | Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`. |
| Mobile | GitHub Releases | Built with `--dart-define-from-file=env.release.json`, published as a release asset. |

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the complete deployment reference, cron design, and data-migration notes.

---

## 🧪 Testing

```bash
cd backend
npm test            # vitest: XP math + quest-engine determinism
npm run typecheck   # tsc --noEmit
```

---

## 🔒 Notes

- `.env` files and `mobile/env.release.json` are git-ignored — never commit real secrets. The anon key is RLS-safe by design (clients can only SELECT their own rows); the service-role key lives **only** on the backend.
- See [`docs/notifications-setup.md`](docs/notifications-setup.md) for FCM / native alarm configuration.

---

<div align="center">

**Built by [Harsh Bathija](https://github.com/HarshBathija-04)**

*The system only rewards what actually happened.*

</div>
