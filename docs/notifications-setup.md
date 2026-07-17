# Notifications & Alarms — Setup Guide

The notification/alarm system runs **without Firebase** (in-app inbox, native
Android alarms, scheduler, daily reset all work). Push delivery activates only
after the Firebase artifacts below are wired in.

## 1. Firebase project (one-time)

1. Create a project at https://console.firebase.google.com (e.g. `arise-os`).
2. **Android app**: package name `com.arise.os` → download `google-services.json`
   → place it at `mobile/android/app/google-services.json`.
   (The Gradle plugin only applies when the file exists, so builds pass without it.)
3. **Web app**: register a web app → copy the config values into `Website/.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
4. **VAPID key**: Project Settings → Cloud Messaging → Web Push certificates →
   Generate key pair → `NEXT_PUBLIC_FIREBASE_VAPID_KEY=...` in `Website/.env.local`.
5. **Service account** (backend): Project Settings → Service accounts →
   Generate new private key → put the whole JSON (single line) into `backend/.env`:
   ```
   PUSH_ENABLED=true
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
   ```

## 2. Database migration

```bash
cd backend
DIRECT_URL=postgresql://... npx tsx scripts/apply-migrations.ts   # applies 0007
```

## 3. Backend scheduling

- `CRON_ENABLED=true` → in-process node-cron: minutely scheduler tick + the
  existing daily-quest schedules.
- External trigger fallback (Render cron etc.):
  - `POST /v1/internal/cron/scheduler-tick` (run every minute)
  - `POST /v1/internal/cron/daily-reset` (manual full reset)
  - header `x-internal-secret: $INTERNAL_CRON_SECRET`

## 4. What lives where

| Concern | Implementation |
|---|---|
| Quest reset / 23:00 reminder | `backend/src/services/scheduler.service.ts` (per-user local time via `user_settings.reset_time` / `evening_reminder_time` / `timezone`) |
| Daily reset (expire quests, streak rule, report, generate, push) | `backend/src/services/daily-reset.service.ts` |
| Push fan-out | `backend/src/services/push.service.ts` (FCM, token pruning, analytics) |
| Android exact alarms + full-screen UI | `mobile/android/.../alarm/*.kt` (native; offline; boot/update/timezone restore) |
| Device ↔ server alarm sync | `GET /v1/alarms/plan` + `users.timetable_version` + FCM data `{type:resync}` + resume sync + 6h WorkManager pass |
| Web push | `Website/public/firebase-messaging-sw.js` + `src/components/push/push-manager.tsx` (enable from Settings) |
| Analytics events | `alarm_events` + `notification_events` tables (ingest: `POST /v1/alarms/events`, `POST /v1/notifications/events`) |

## 5. Device test checklist (physical device)

- [ ] Settings → "Fire test alarm in 10 seconds" → lock screen → full-screen alarm w/ sound+vibration
- [ ] No response for 2 min → alarm re-fires; after 3rd attempt → "Missed" notification, `alarm_events` MISSED row
- [ ] Confirm → alarm stops → app opens → focus timer running (STUDY/WORK blocks)
- [ ] Skip → reason picker → recorded in `alarm_events.skip_reason`
- [ ] Snooze 5 min → re-fires in 5 min (attempt counter reset, max 3 snoozes)
- [ ] Reboot with an alarm due in ~5 min → BootReceiver restores → fires
- [ ] `adb shell dumpsys deviceidle force-idle` → alarm still fires (Doze)
- [ ] Airplane mode → alarm fires; on reconnect events appear in `alarm_events`
- [ ] Edit a block on the web → Android reschedules (foreground: instant via realtime; background: FCM resync or next resume)
- [ ] Change device timezone → alarms recalculated
- [ ] 23:00 reminder shows correct remaining count; "🎉" variant when everything is done
- [ ] Reset push arrives at the configured reset time; repeat cron ticks don't duplicate (dedupe keys)
