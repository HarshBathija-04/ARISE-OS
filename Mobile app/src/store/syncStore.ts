/**
 * SOLO OS — Offline sync store.
 *
 * A durable, persisted queue of progression actions. `start()` drains it now,
 * on an interval, and whenever the app returns to the foreground. Actions that
 * fail on transport stay PENDING and are retried; server rejections become
 * REVIEW; successes become VALIDATED and are pruned after a short grace period.
 */
import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import { submitAction } from '@/services/sync/syncEngine';
import type { PendingAction, SyncActionType, SyncStatus } from '@/services/sync/types';
import { nowIso } from '@/utils/date';

const MAX_ATTEMPTS = 8;
const FLUSH_INTERVAL_MS = 30_000;
const VALIDATED_TTL_MS = 60_000;

let actionCounter = 0;
function makeId(): string {
  actionCounter += 1;
  return `sync_${Date.now().toString(36)}_${actionCounter}`;
}

interface SyncState {
  queue: PendingAction[];
  flushing: boolean;
  started: boolean;
  lastFlushAt: string | null;

  enqueue: (type: SyncActionType, payload: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  start: () => void;
  retryReview: (id: string) => void;
  dismiss: (id: string) => void;
  pendingCount: () => number;
  reviewCount: () => number;
}

let interval: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      queue: [],
      flushing: false,
      started: false,
      lastFlushAt: null,

      enqueue: (type, payload) => {
        const action: PendingAction = {
          id: makeId(),
          type,
          payload,
          status: 'PENDING',
          attempts: 0,
          note: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((s) => ({ queue: [...s.queue, action] }));
        void get().flush();
      },

      flush: async () => {
        if (get().flushing) return;
        set({ flushing: true });
        try {
          // Prune resolved actions past their TTL first.
          const now = Date.now();
          set((s) => ({
            queue: s.queue.filter(
              (a) => a.status !== 'VALIDATED' || now - new Date(a.updatedAt).getTime() < VALIDATED_TTL_MS,
            ),
          }));

          const sendable = get().queue.filter(
            (a) => (a.status === 'PENDING' || a.status === 'SYNCING') && a.attempts < MAX_ATTEMPTS,
          );

          for (const action of sendable) {
            patch(set, action.id, { status: 'SYNCING' });
            const res = await submitAction(action);
            const attempts = action.attempts + 1;

            let status: SyncStatus;
            if (res.outcome === 'VALIDATED') status = 'VALIDATED';
            else if (res.outcome === 'REVIEW') status = 'REVIEW';
            else status = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';

            patch(set, action.id, { status, attempts, note: res.note });
          }

          set({ lastFlushAt: nowIso() });
        } finally {
          set({ flushing: false });
        }
      },

      start: () => {
        if (get().started) {
          void get().flush();
          return;
        }
        set({ started: true });
        void get().flush();

        if (!interval) {
          interval = setInterval(() => {
            void useSyncStore.getState().flush();
          }, FLUSH_INTERVAL_MS);
        }
        if (!appStateSub) {
          appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') void useSyncStore.getState().flush();
          });
        }
      },

      retryReview: (id) => {
        patch(set, id, { status: 'PENDING', attempts: 0, note: null });
        void get().flush();
      },

      dismiss: (id) => set((s) => ({ queue: s.queue.filter((a) => a.id !== id) })),

      pendingCount: () =>
        get().queue.filter((a) => a.status === 'PENDING' || a.status === 'SYNCING').length,

      reviewCount: () => get().queue.filter((a) => a.status === 'REVIEW').length,
    }),
    {
      name: 'soloos-sync-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({ queue: s.queue }),
    },
  ),
);

/** Immutably patch one queued action by id. */
function patch(
  set: (fn: (s: SyncState) => Partial<SyncState>) => void,
  id: string,
  changes: Partial<PendingAction>,
): void {
  set((s) => ({
    queue: s.queue.map((a) => (a.id === id ? { ...a, ...changes, updatedAt: nowIso() } : a)),
  }));
}
