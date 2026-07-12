/**
 * SOLO OS — Streak Store.
 * Manages 8 streaks + Streak Shields using the streak engine.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import type { Streak, StreakCode } from '@/types';
import {
  createInitialStreaks, createInitialShieldState,
  recordStreakSuccess, recordStreakFailure,
  updateShieldState, consumeShield, isShadowStreak,
  type StreakShieldState,
} from '@/game-engine/streak-engine';
import { todayIso } from '@/utils/date';
import { useOverlayStore } from './overlayStore';

interface StreakState {
  streaks: Streak[];
  shields: StreakShieldState;
  /** Track which dates had streaks to build heatmaps. */
  successDates: Record<StreakCode, string[]>;

  ensureSeeded: () => void;
  recordSuccess: (code: StreakCode) => { milestone: number | null };
  recordFailure: (code: StreakCode, opts?: { useShield?: boolean; allowShadowShield?: boolean }) => { wasReset: boolean; shieldUsed: boolean };
  updateShields: (isExceptionalDay: boolean) => void;
  getStreak: (code: StreakCode) => Streak | undefined;
  getMaxStreak: () => number;
  getMaxStreaks: () => Record<string, number>;
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      streaks: [],
      shields: createInitialShieldState(),
      successDates: {} as Record<StreakCode, string[]>,

      ensureSeeded: () => {
        if (get().streaks.length === 0) {
          set({
            streaks: createInitialStreaks(),
            successDates: Object.fromEntries(
              createInitialStreaks().map((s) => [s.code, [] as string[]])
            ) as Record<StreakCode, string[]>,
          });
        }
      },

      recordSuccess: (code) => {
        const streak = get().streaks.find((s) => s.code === code);
        if (!streak) return { milestone: null };

        const today = todayIso();
        const result = recordStreakSuccess(streak, today);

        set((s) => ({
          streaks: s.streaks.map((st) => (st.code === code ? result.streak : st)),
          successDates: {
            ...s.successDates,
            [code]: [...(s.successDates[code] ?? []), today].slice(-365),
          },
        }));

        // Celebrate milestone streaks (7/14/30/60/100…) with a full-screen overlay.
        if (result.milestone != null) {
          useOverlayStore.getState().showMilestone({
            streakLabel: result.streak.label,
            days: result.milestone,
          });
        }

        return { milestone: result.milestone };
      },

      recordFailure: (code, opts = {}) => {
        const streak = get().streaks.find((s) => s.code === code);
        if (!streak) return { wasReset: false, shieldUsed: false };

        const today = todayIso();
        const canUseShield = opts.useShield !== false;
        const allowShadow = opts.allowShadowShield ?? false;
        const shieldAllowed = canUseShield && (!isShadowStreak(code) || allowShadow);
        const shieldAvail = shieldAllowed && get().shields.count > 0;

        const result = recordStreakFailure(streak, today, {
          allowShield: shieldAllowed,
          shieldAvailable: shieldAvail,
        });

        let shields = get().shields;
        if (result.shieldUsed) {
          const consumed = consumeShield(shields);
          if (consumed) shields = consumed;
        }

        set((s) => ({
          streaks: s.streaks.map((st) => (st.code === code ? result.streak : st)),
          shields,
        }));

        return { wasReset: result.wasReset, shieldUsed: result.shieldUsed };
      },

      updateShields: (isExceptionalDay) => {
        set((s) => ({ shields: updateShieldState(s.shields, isExceptionalDay) }));
      },

      getStreak: (code) => get().streaks.find((s) => s.code === code),

      getMaxStreak: () => {
        return Math.max(...get().streaks.map((s) => s.longestStreak), 0);
      },

      getMaxStreaks: () => {
        const result: Record<string, number> = {};
        for (const s of get().streaks) {
          result[s.code] = s.longestStreak;
        }
        return result;
      },
    }),
    {
      name: 'soloos-streak-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({
        streaks: s.streaks,
        shields: s.shields,
        successDates: s.successDates,
      }),
    },
  ),
);
