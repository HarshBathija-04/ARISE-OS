/**
 * SOLO OS — Reward Store.
 * Manages reward purchases via coin engine.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import type { Reward, CoinTransaction } from '@/types';
import { applyCoins, canPurchase } from '@/game-engine/coin-engine';
import { createInitialRewards } from '@/constants/rewards';
import { nowIso } from '@/utils/date';
import { useGameStore } from './gameStore';

interface RewardState {
  rewards: Reward[];
  purchaseHistory: CoinTransaction[];

  ensureSeeded: () => void;
  purchase: (rewardId: string) => { ok: boolean; error?: string };
  addCustomReward: (name: string, description: string, coinCost: number, cooldownHours: number) => void;
  getReward: (id: string) => Reward | undefined;
}

let customCounter = 0;

export const useRewardStore = create<RewardState>()(
  persist(
    (set, get) => ({
      rewards: [],
      purchaseHistory: [],

      ensureSeeded: () => {
        if (get().rewards.length === 0) {
          set({ rewards: createInitialRewards() });
        }
      },

      purchase: (rewardId) => {
        const reward = get().rewards.find((r) => r.id === rewardId);
        if (!reward) return { ok: false, error: 'REWARD_NOT_FOUND' };

        const gameState = useGameStore.getState();
        const now = nowIso();

        // Check affordability and cooldown.
        const check = canPurchase(
          gameState.profile.coins,
          reward.coinCost,
          reward.lastPurchasedAt,
          reward.cooldownHours,
          now,
        );
        if (!check.ok) return { ok: false, error: check.reason };

        // Apply coin deduction.
        const result = applyCoins(
          gameState.profile.coins,
          -reward.coinCost,
          'PURCHASE',
          rewardId,
          now,
        );
        if (result.rejected) return { ok: false, error: result.rejected };

        // Update game store coins.
        useGameStore.setState((s) => ({
          profile: { ...s.profile, coins: result.balance, updatedAt: now },
          transactions: result.transaction
            ? [result.transaction, ...s.transactions].slice(0, 500)
            : s.transactions,
        }));

        // Update reward.
        set((s) => ({
          rewards: s.rewards.map((r) =>
            r.id === rewardId
              ? { ...r, purchaseCount: r.purchaseCount + 1, lastPurchasedAt: now }
              : r,
          ),
          purchaseHistory: result.transaction
            ? [result.transaction, ...s.purchaseHistory].slice(0, 200)
            : s.purchaseHistory,
        }));

        // System event.
        useGameStore.getState().pushEvent({
          type: 'REWARD',
          title: 'REWARD AUTHORIZED',
          detail: reward.name,
        });

        return { ok: true };
      },

      addCustomReward: (name, description, coinCost, cooldownHours) => {
        customCounter += 1;
        const newReward: Reward = {
          id: `custom_${Date.now().toString(36)}_${customCounter}`,
          name,
          description,
          coinCost: Math.max(10, coinCost),
          cooldownHours: Math.max(0, cooldownHours),
          purchaseCount: 0,
          lastPurchasedAt: null,
          isCustom: true,
        };
        set((s) => ({ rewards: [...s.rewards, newReward] }));
      },

      getReward: (id) => get().rewards.find((r) => r.id === id),
    }),
    {
      name: 'soloos-reward-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({
        rewards: s.rewards,
        purchaseHistory: s.purchaseHistory,
      }),
    },
  ),
);
