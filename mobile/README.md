# Arise OS — Mobile

Flutter client for **Arise OS**, the Solo Leveling-themed gamified productivity
system. Online-first: all game logic lives in the Express API
(`backend/`), Supabase handles auth + realtime.

## One-time setup

This repo contains only the Dart sources (standard layout: `pubspec.yaml`,
`lib/`). Generate the platform folders once:

```bash
cd mobile
flutter create . --platforms android,ios
flutter pub get
```

Requires Flutter 3.29+ (Dart 3.7+).

## Running

Configuration is injected via `--dart-define`:

| Define              | Purpose                          | Default                  |
| ------------------- | -------------------------------- | ------------------------ |
| `SUPABASE_URL`      | Supabase project URL             | — (required)             |
| `SUPABASE_ANON_KEY` | Supabase anon/public key         | — (required)             |
| `API_BASE_URL`      | Express API base URL             | `https://arise-os.onrender.com` |

`10.0.2.2` is the Android-emulator alias for the host machine's localhost.
For an iOS simulator use `http://localhost:4000`; for a physical device use
your machine's LAN IP.

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://<project>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon-key> \
  --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

## Release APK

Release builds must include the Supabase values at compile time. Create a local
`env.release.json` from `env.release.example.json` and fill in the real project
URL and anon key:

```bash
flutter build apk --release --dart-define-from-file=env.release.json
```

Android release builds fail fast if `SUPABASE_URL` or `SUPABASE_ANON_KEY` is
missing, because an APK without them can install but crash before the login
screen appears.

## Architecture

- **State**: `flutter_riverpod` — `FutureProvider` per feature, invalidated
  after every mutation and on Supabase realtime `postgres_changes` events
  (debounced 500 ms) via `core/realtime/`.
- **Navigation**: `go_router` with a `StatefulShellRoute` bottom-nav shell
  (`/dashboard /quests /focus /timetable /habits`); redirects to `/login`
  when there is no session.
- **API**: `dio` client (`core/api/api_client.dart`) attaches
  `Authorization: Bearer <supabase access token>` and unwraps the
  `{ok: true, ...}` / `{ok: false, error}` envelope, throwing `ApiException`.
- **Auth**: Supabase email/password. Signup passes `data: {name}` and then
  calls `POST /v1/account/bootstrap` (idempotent — also called on login).
- **Models**: plain Dart classes with hand-written `fromJson`, tolerant of
  both camelCase view models and snake_case Supabase rows.

## Layout

```
lib/
  main.dart                  Supabase.initialize + ProviderScope + MaterialApp.router
  app/router.dart            go_router config + bottom-nav shell
  app/theme.dart             dark "System" theme (#050A14 / #4CC9F0 / #7B2CBF)
  core/api/                  dio client, ApiException, provider
  core/realtime/             realtime channel + provider invalidation
  core/models/               plain models + tolerant JSON helpers
  core/widgets/              SystemPanel, XpBar, StatChip, DifficultyBadge,
                             AsyncValueView, award feedback (snackbar/level-up)
  features/auth/             login, signup, auth controller
  features/dashboard/        status panel, life score, quest summary, streaks, log
  features/quests/           daily quests + complete/partial/fail + awards
  features/focus/            category/minutes picker, local ticking timer
  features/timetable/        day blocks, state chips, study-log sheet
  features/habits/           build habits, shadow system, urges, recovery quest
```
