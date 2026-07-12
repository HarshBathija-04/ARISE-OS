/**
 * SOLO OS — Achievement Store.
 * Tracks unlocked achievements, evaluates new ones, and manages titles.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import type { AchievementDef } from '@/types';
import { evaluateAchievements, type PlayerMetrics, type AchievementUnlock } from '@/game-engine/achievement-engine';
import { ALL_ACHIEVEMENTS } from '@/constants/achievements';
import { nowIso } from '@/utils/date';

export interface UnlockedAchievement {
  key: string;
  unlockedAt: string;
}

interface AchievementState {
  unlocked: UnlockedAchievement[];
  /** Lifetime metrics snapshot (aggregated). */
  metrics: Partial<PlayerMetrics>;

  evaluate: (metrics: PlayerMetrics) => AchievementUnlock[];
  isUnlocked: (key: string) => boolean;
  getUnlockedDefs: () => AchievementDef[];
  getLockedDefs: () => AchievementDef[];
  getProgress: (key: string, metrics: PlayerMetrics) => number;
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      unlocked: [],
      metrics: {},

      evaluate: (metrics) => {
        const alreadySet = new Set(get().unlocked.map((u) => u.key));
        const newly = evaluateAchievements(metrics, alreadySet);

        if (newly.length > 0) {
          const newUnlocked = newly.map((n) => ({
            key: n.achievement.key,
            unlockedAt: n.unlockedAt,
          }));

          set((s) => ({
            unlocked: [...s.unlocked, ...newUnlocked],
            metrics,
          }));
        } else {
          set({ metrics });
        }

        return newly;
      },

      isUnlocked: (key) => get().unlocked.some((u) => u.key === key),

      getUnlockedDefs: () => {
        const keys = new Set(get().unlocked.map((u) => u.key));
        return ALL_ACHIEVEMENTS.filter((a) => keys.has(a.key));
      },

      getLockedDefs: () => {
        const keys = new Set(get().unlocked.map((u) => u.key));
        return ALL_ACHIEVEMENTS.filter((a) => !keys.has(a.key));
      },

      getProgress: (key, metrics) => {
        const def = ALL_ACHIEVEMENTS.find((a) => a.key === key);
        if (!def) return 0;
        const value = metrics[def.metric];
        if (typeof value !== 'number') return 0;
        return Math.min(1, value / def.threshold);
      },
    }),
    {
      name: 'soloos-achievement-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({
        unlocked: s.unlocked,
        metrics: s.metrics,
      }),
    },
  ),
);
