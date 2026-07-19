# ARISE OS

A real-life RPG progression operating system with **one shared backend** and **two frontends**.

## Structure

```
Arise-OS/
├── Website/        # Next.js (App Router) — web frontend
├── backend/        # Express API — canonical backend (supabase-js)
└── mobile/         # Flutter — Windows/Android/iOS app
```

## Architecture

- **Canonical backend**: the `backend` app owns all game logic (XP, quests, streaks) via Express + supabase-js, and exposes a REST API under `/v1/*`.
- **Web frontend**: Next.js app that calls the Express API. Authenticated with Supabase Auth.
- **Mobile frontend**: Flutter app using Riverpod, connects to the same Express API with a Supabase JWT bearer token.
- **Timetable** is fully relational and shared by both frontends (`TimetableBlock` / `TimetableBlockLog` / `StudyLog`).

## Demo

Anyone can try Arise OS — no signup needed.

**📱 Android app:** download the APK from the [latest release](https://github.com/HarshBathija-04/ARISE-OS/releases/latest) and install it (allow installs from unknown sources if prompted).

**🌐 Web dashboard:** **[https://arise-os-web.vercel.app](https://arise-os-web.vercel.app)**

**Demo Credentials** (both app and website have a tap-to-fill button on the login screen):
- **Email:** `demo@arise.os`
- **Password:** `password123`

> The demo account is shared and may be reset periodically.

## Getting started

### Backend
```bash
cd backend
npm install
npm run dev               # http://localhost:4000
```

### Website
```bash
cd Website
npm install
npm run dev               # http://localhost:3000
```

### Mobile app
```bash
cd mobile
flutter pub get
flutter run -d windows \
  --dart-define=SUPABASE_URL=https://<project>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon-key> \
  --dart-define=API_BASE_URL=http://localhost:4000
```

## Notes
- `.env` files are git-ignored — never commit real secrets.
- See `ARCHITECTURE.md` for full deployment and sync details.
