/**
 * SOLO OS — sync bootstrap.
 *
 * Wires the shared-backend sync into app startup:
 *  1. hydrate the auth session from secure storage,
 *  2. pull the server snapshot (if signed in) so this device starts current,
 *  3. debounce-push local game + timetable changes back up.
 *
 * Entirely no-ops when the API is not configured or the user is signed out.
 */
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { useTimetableStore } from '@/store/timetableStore';
import { isApiEnabled } from '@/services/api/client';
import { pullSnapshot, pushSnapshot, canSync } from './snapshot';

// The game store drives snapshot sync. The timetable syncs itself relationally
// (see src/services/api/timetable.ts), so it is not part of the snapshot.

let started = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void (async () => {
      if (await canSync()) void pushSnapshot();
    })();
  }, 4000);
}

/** Call once from the root layout. Returns a cleanup function. */
export function initSync(): () => void {
  if (started) return () => {};
  started = true;

  void (async () => {
    await useAuthStore.getState().hydrate();
    if (isApiEnabled && (await canSync())) {
      await pullSnapshot();
      // Timetable is relational — pull the shared rows too.
      await useTimetableStore.getState().hydrateFromServer();
    }
  })();

  const unsubGame = useGameStore.subscribe(() => schedulePush());

  return () => {
    unsubGame();
    if (pushTimer) clearTimeout(pushTimer);
    started = false;
  };
}
