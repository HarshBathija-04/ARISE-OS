/**
 * SOLO OS — Reward definitions.
 */
import type { Reward } from '@/types';

export const DEFAULT_REWARDS: Omit<Reward, 'purchaseCount' | 'lastPurchasedAt'>[] = [
  { id: 'reward_gaming', name: '1 HOUR GUILT-FREE GAMING', description: 'One hour of gaming without System penalty.', coinCost: 100, cooldownHours: 24, isCustom: false },
  { id: 'reward_movie', name: 'MOVIE NIGHT', description: 'Watch a movie guilt-free.', coinCost: 150, cooldownHours: 48, isCustom: false },
  { id: 'reward_food', name: 'FAVOURITE FOOD', description: 'Order or eat your favourite meal.', coinCost: 120, cooldownHours: 48, isCustom: false },
  { id: 'reward_rest', name: 'REST EVENING', description: 'An evening of rest with no productivity requirements.', coinCost: 80, cooldownHours: 24, isCustom: false },
  { id: 'reward_small_item', name: 'BUY A SMALL GAMING ITEM', description: 'Purchase a small gaming accessory or item.', coinCost: 500, cooldownHours: 168, isCustom: false },
  { id: 'reward_game', name: 'BUY A GAME', description: 'Purchase a game of your choice.', coinCost: 1000, cooldownHours: 336, isCustom: false },
];

export function createInitialRewards(): Reward[] {
  return DEFAULT_REWARDS.map((r) => ({
    ...r,
    purchaseCount: 0,
    lastPurchasedAt: null,
  }));
}
