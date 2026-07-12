/**
 * SOLO OS — Boss Store.
 * Manages boss state, damage application, and battle logs.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import type { Boss, BossLogEntry, ActivityType } from '@/types';
import {
  calculateBossDamage, applyDamage, activateBoss,
  calculateBossRecovery, todaysDamage, type DamageInput,
} from '@/game-engine/boss-engine';
import { createInitialBosses, getBossDef } from '@/constants/bosses';
import { todayIso, nowIso } from '@/utils/date';
import { useOverlayStore } from './overlayStore';

export interface BossDamageOutcome {
  ok: boolean;
  damage: number;
  isCritical: boolean;
  hpAfter: number;
  defeated: boolean;
  bossName: string;
  error?: string;
}

interface BossState {
  bosses: Boss[];
  logs: BossLogEntry[];
  recoveryAppliedToday: number;
  recoveryDate: string;

  // Actions
  ensureSeeded: () => void;
  dealDamage: (bossId: string, input: DamageInput) => BossDamageOutcome;
  activateBossById: (id: string) => void;
  applyRecovery: (bossId: string, failedMissionsToday: number) => void;
  getActiveBoss: () => Boss | null;
  getBossLogs: (bossId: string) => BossLogEntry[];
  getTodaysDamage: (bossId: string) => number;
}

export const useBossStore = create<BossState>()(
  persist(
    (set, get) => ({
      bosses: [],
      logs: [],
      recoveryAppliedToday: 0,
      recoveryDate: todayIso(),

      ensureSeeded: () => {
        if (get().bosses.length === 0) {
          set({ bosses: createInitialBosses() });
        }
        // Reset daily recovery tracker.
        if (get().recoveryDate !== todayIso()) {
          set({ recoveryAppliedToday: 0, recoveryDate: todayIso() });
        }
      },

      dealDamage: (bossId, input): BossDamageOutcome => {
        const boss = get().bosses.find((b) => b.id === bossId);
        if (!boss) return { ok: false, damage: 0, isCritical: false, hpAfter: 0, defeated: false, bossName: '', error: 'BOSS_NOT_FOUND' };
        if (boss.status !== 'ACTIVE') return { ok: false, damage: 0, isCritical: false, hpAfter: boss.currentHp, defeated: false, bossName: boss.name, error: 'BOSS_NOT_ACTIVE' };

        const result = calculateBossDamage(boss, input);
        const updated = applyDamage(boss, result);

        let bosses = get().bosses.map((b) => (b.id === bossId ? updated : b));

        // If defeated, unlock next locked boss.
        if (result.defeated) {
          const nextLocked = bosses.find((b) => b.status === 'LOCKED');
          if (nextLocked) {
            bosses = bosses.map((b) =>
              b.id === nextLocked.id ? activateBoss(b) : b,
            );
          }
        }

        set({
          bosses,
          logs: [result.logEntry, ...get().logs].slice(0, 1000),
        });

        // Critical hits trigger a cinematic screen-shake burst.
        if (result.isCritical) {
          useOverlayStore.getState().showCriticalImpact({
            damage: result.damage,
            bossName: boss.name,
          });
        }

        return {
          ok: true,
          damage: result.damage,
          isCritical: result.isCritical,
          hpAfter: result.hpAfter,
          defeated: result.defeated,
          bossName: boss.name,
        };
      },

      activateBossById: (id) => {
        set({
          bosses: get().bosses.map((b) =>
            b.id === id ? activateBoss(b) : b,
          ),
        });
      },

      applyRecovery: (bossId, failedMissionsToday) => {
        const boss = get().bosses.find((b) => b.id === bossId);
        if (!boss || boss.status !== 'ACTIVE') return;

        const { hpRecovered, newHp } = calculateBossRecovery(boss, {
          failedMissionsToday,
          recoveryAppliedToday: get().recoveryAppliedToday,
        });

        if (hpRecovered > 0) {
          set({
            bosses: get().bosses.map((b) =>
              b.id === bossId ? { ...b, currentHp: newHp } : b,
            ),
            recoveryAppliedToday: get().recoveryAppliedToday + hpRecovered,
          });
        }
      },

      getActiveBoss: () => {
        return get().bosses.find((b) => b.status === 'ACTIVE') ?? null;
      },

      getBossLogs: (bossId) => {
        return get().logs.filter((l) => l.bossId === bossId);
      },

      getTodaysDamage: (bossId) => {
        return todaysDamage(
          get().logs.filter((l) => l.bossId === bossId),
          todayIso(),
        );
      },
    }),
    {
      name: 'soloos-boss-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({
        bosses: s.bosses,
        logs: s.logs,
        recoveryAppliedToday: s.recoveryAppliedToday,
        recoveryDate: s.recoveryDate,
      }),
    },
  ),
);
