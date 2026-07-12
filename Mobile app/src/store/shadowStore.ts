/**
 * SOLO OS — Shadow Habit Store.
 * Tracks 7 shadow habits, urge logging, relapse recording, and recovery.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import type { ShadowHabit, ShadowHabitCode, UrgeLog, UrgeResult } from '@/types';
import { nowIso, todayIso } from '@/utils/date';

const SHADOW_DEFS: Omit<ShadowHabit, 'currentStreak' | 'longestStreak' | 'urgesRecorded' | 'urgesResisted' | 'relapseCount' | 'lastRelapseAt' | 'commonTrigger' | 'riskTime'>[] = [
  { code: 'REELS_SHORTS', label: 'REELS & SHORTS', sensitive: false },
  { code: 'PORNOGRAPHY', label: 'PORNOGRAPHY', sensitive: true },
  { code: 'MASTURBATION', label: 'MASTURBATION', sensitive: true },
  { code: 'UNPLANNED_GAMING', label: 'UNPLANNED GAMING', sensitive: false },
  { code: 'EXCESSIVE_YOUTUBE', label: 'EXCESSIVE YOUTUBE', sensitive: false },
  { code: 'LATE_NIGHT_PHONE', label: 'LATE NIGHT PHONE', sensitive: false },
  { code: 'PROCRASTINATION', label: 'PROCRASTINATION', sensitive: false },
];

function createInitialHabits(): ShadowHabit[] {
  return SHADOW_DEFS.map((d) => ({
    ...d,
    currentStreak: 0,
    longestStreak: 0,
    urgesRecorded: 0,
    urgesResisted: 0,
    relapseCount: 0,
    lastRelapseAt: null,
    commonTrigger: null,
    riskTime: null,
  }));
}

export interface UrgeInput {
  habitCode: ShadowHabitCode;
  intensity: number;
  trigger: string | null;
  mood: string | null;
  locationCategory: string | null;
  actionTaken: string | null;
  result: UrgeResult;
}

export interface RecoveryMission {
  id: string;
  habitCode: ShadowHabitCode;
  objectives: string[];
  completed: boolean;
  xpAwarded: number;
  createdAt: string;
  completedAt: string | null;
}

interface ShadowState {
  habits: ShadowHabit[];
  urgeLogs: UrgeLog[];
  recoveryMissions: RecoveryMission[];

  ensureSeeded: () => void;
  logUrge: (input: UrgeInput) => { relapsed: boolean; recoveryMission: RecoveryMission | null };
  completeRecovery: (id: string) => void;
  getHabit: (code: ShadowHabitCode) => ShadowHabit | undefined;
  getRecentUrges: (code?: ShadowHabitCode, limit?: number) => UrgeLog[];
  getActiveRecovery: () => RecoveryMission | null;
  getRecoveryHistory: () => RecoveryMission[];
}

let urgeCounter = 0;
let recoveryCounter = 0;

const RECOVERY_OBJECTIVES = [
  'Leave the triggering environment.',
  'Drink water.',
  'Walk for 10 minutes.',
  'Record the trigger.',
  'Remove or block the triggering source.',
  'Complete one 15-minute productive action.',
];

export const useShadowStore = create<ShadowState>()(
  persist(
    (set, get) => ({
      habits: [],
      urgeLogs: [],
      recoveryMissions: [],

      ensureSeeded: () => {
        if (get().habits.length === 0) {
          set({ habits: createInitialHabits() });
        }
      },

      logUrge: (input) => {
        urgeCounter += 1;
        const log: UrgeLog = {
          id: `urge_${Date.now().toString(36)}_${urgeCounter}`,
          habitCode: input.habitCode,
          intensity: Math.max(1, Math.min(10, input.intensity)),
          trigger: input.trigger,
          mood: input.mood,
          locationCategory: input.locationCategory,
          actionTaken: input.actionTaken,
          result: input.result,
          createdAt: nowIso(),
        };

        const relapsed = input.result === 'RELAPSED';
        let recoveryMission: RecoveryMission | null = null;

        set((s) => {
          const habits = s.habits.map((h) => {
            if (h.code !== input.habitCode) return h;

            const updated = { ...h };
            updated.urgesRecorded = h.urgesRecorded + 1;

            if (input.result === 'RESISTED') {
              updated.urgesResisted = h.urgesResisted + 1;
              updated.currentStreak = h.currentStreak + 1;
              updated.longestStreak = Math.max(updated.longestStreak, updated.currentStreak);
            } else if (input.result === 'RELAPSED') {
              updated.relapseCount = h.relapseCount + 1;
              updated.lastRelapseAt = nowIso();
              updated.currentStreak = 0;
              // Do NOT remove levels or achievements per spec.
            }

            // Track common trigger.
            if (input.trigger) {
              updated.commonTrigger = input.trigger;
            }

            return updated;
          });

          return {
            habits,
            urgeLogs: [log, ...s.urgeLogs].slice(0, 500),
          };
        });

        // Generate recovery mission on relapse.
        if (relapsed) {
          recoveryCounter += 1;
          recoveryMission = {
            id: `rec_${Date.now().toString(36)}_${recoveryCounter}`,
            habitCode: input.habitCode,
            objectives: RECOVERY_OBJECTIVES,
            completed: false,
            xpAwarded: 0,
            createdAt: nowIso(),
            completedAt: null,
          };

          set((s) => ({
            recoveryMissions: [recoveryMission!, ...s.recoveryMissions].slice(0, 100),
          }));
        }

        return { relapsed, recoveryMission };
      },

      completeRecovery: (id) => {
        set((s) => ({
          recoveryMissions: s.recoveryMissions.map((r) =>
            r.id === id ? { ...r, completed: true, completedAt: nowIso(), xpAwarded: 40 } : r,
          ),
        }));
      },

      getHabit: (code) => get().habits.find((h) => h.code === code),

      getRecentUrges: (code, limit = 20) => {
        const logs = code
          ? get().urgeLogs.filter((l) => l.habitCode === code)
          : get().urgeLogs;
        return logs.slice(0, limit);
      },

      getActiveRecovery: () => {
        return get().recoveryMissions.find((r) => !r.completed) ?? null;
      },

      getRecoveryHistory: () => {
        return get().recoveryMissions.filter((r) => r.completed);
      },
    }),
    {
      name: 'soloos-shadow-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({
        habits: s.habits,
        urgeLogs: s.urgeLogs,
        recoveryMissions: s.recoveryMissions,
      }),
    },
  ),
);
