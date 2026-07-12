# SOLO OS

> A real-life RPG "operating system" — turn discipline, study, training, and
> recovery into a progression game with levels, attributes, missions, bosses,
> streaks, and an AI intelligence layer. Android-first, offline-capable, built
> with React Native (Expo). Original visual identity — no franchise assets.

Built for Harsh Bathija. The interface is designed to feel like a secret
operating system: dark, minimal, terminal-styled, with glow used sparingly to
represent energy and progression.

---

## Highlights

- **Progression engine** — 100 levels (`round(10·L^1.55)+10·L`), 9 ranks, 8
  attributes, server-mirrored math with hard invariants (XP ≥ 0, level 1..100,
  coins ≥ 0, HP 0..max).
- **Adaptive missions** — daily generation, verification (manual / timer /
  progress), anti-farming (daily XP soft-cap, diminishing returns).
- **Focus Mode** — XP from *actual* active time, Skia energy ring, Android
  back-guard, session history.
- **Campaigns & Bosses** — 5 campaigns / 57 stages, 6 bosses with weakness
  criticals, phase transitions, and daily-capped recovery.
- **Shadow Habits & Recovery** — non-shame recovery protocol, Privacy Mode,
  relapse never removes levels/XP/achievements.
- **Streaks, Shields, Achievements, Titles** — 8 streaks, Streak Shields (max 3),
  107 achievements, equippable titles (≤5% bonuses).
- **Solo Coins & Reward Vault** — earn/spend, custom rewards, cooldowns.
- **Analytics & Life Performance** — weighted 30-day rolling score across 5
  categories; 7/30/90/365-day views.
- **ECHO (AI layer)** — data-driven morning / evening / weekly **SYSTEM ANALYSIS
  REPORTS**. Works fully offline (`mock` provider); real providers (Claude /
  OpenAI / Gemini) run through a Supabase edge function that holds the key.
- **Notifications** — 5 local channels, privacy-safe copy, individually
  toggleable, scheduled reminders.
- **Offline-first sync** — every action applies locally and is queued for server
  validation (`SYNC PENDING → SYSTEM VALIDATED / ACTION REQUIRES REVIEW`).

## Tech stack

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript (strict) · Expo Router
(typed routes) · NativeWind 4 · Reanimated 4 · Skia · Zustand · TanStack Query ·
React Hook Form + Zod · Supabase · gifted-charts · Lucide.

---

## Run it now (free, no keys required)

The app runs **local-first** with no backend and no AI keys.

```bash
npm install
npx expo start        # scan the QR code with Expo Go (Android)
```

1. Install **Expo Go** from the Play Store.
2. `npx expo start`, then scan the QR code.
3. First launch plays the cinematic boot sequence, then drops you into the SYSTEM
   home. All progression is stored on-device (AsyncStorage).

### Environment (optional)

Copy `.env.example` to `.env`. Everything is optional — with no values set, the
app runs in local-only mode with the offline ECHO provider.

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_AI_PROVIDER=mock   # mock | claude | openai | gemini
```

> AI keys are **never** shipped in the client. Real providers call the Supabase
> `echo` edge function, which holds the key server-side.

---

## Build a standalone Android APK (EAS)

```bash
npm i -g eas-cli
eas login
eas build:configure                       # sets extra.eas.projectId in app.json
eas build -p android --profile preview    # internal-distribution APK
```

- `preview` → installable **APK** for testing.
- `production` → **app-bundle** (.aab) for the Play Store.

Build profiles live in `eas.json`. Signing credentials are managed by EAS
(`eas credentials`) — no keystore is committed.

---

## Backend setup (optional)

The full Supabase schema, RLS, RPCs, and seeds are in `supabase/`. See
[`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) for the exact apply order.
The `echo` edge function (`supabase/functions/echo/`) narrates ECHO reports:

```bash
supabase functions deploy echo
supabase secrets set ANTHROPIC_API_KEY=... OPENAI_API_KEY=... GEMINI_API_KEY=...
```

---

## Architecture

```
app/                 Expo Router screens (tabs + stacks + overlays)
src/
  components/        Reusable UI + system overlays (level-up, achievement, …)
  game-engine/       Pure, tested game logic (level, attribute, mission, focus,
                     boss, streak, achievement, performance, coin, echo, …)
  store/             Zustand stores (local-first, persisted)
  services/
    ai/              AI provider abstraction (mock + remote)
    notifications/   Local notification channels + scheduling + haptics
    sync/            Offline action queue + server-RPC submission
    supabase/        Client + auth
  theme/             Centralized palette, typography, spacing, glow
  config/            Typed env
supabase/            Migrations, seeds, edge functions
```

**Design rules**

- UI never calls engines directly — it calls store actions; stores call engines.
- No hardcoded colors in components — everything comes from `src/theme`.
- The server is authoritative when connected; the client mirrors and queues.

---

## Quality gates

```bash
npx tsc --noEmit                       # types (strict)
npm run lint                           # eslint
npm test                               # jest (game-engine + services)
npx expo export --platform android     # production bundle
```

See [`BUILD_STATUS.md`](BUILD_STATUS.md) for the living build record.
