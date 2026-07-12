/**
 * SOLO OS — Coin Engine.
 * Coins are separate from XP. Never negative. All mutations produce a ledger
 * entry (the store persists the transaction list).
 */
import type { CoinTransaction, CoinTransactionReason } from '@/types';

export interface CoinApplyResult {
  balance: number;
  transaction: CoinTransaction | null;
  rejected?: string;
}

let txCounter = 0;
function txId(): string {
  txCounter += 1;
  return `tx_${Date.now().toString(36)}_${txCounter}`;
}

/** Earn or spend coins. Spending beyond balance is rejected (no negative). */
export function applyCoins(
  balance: number,
  amount: number,
  reason: CoinTransactionReason,
  refId: string | null,
  atIso: string,
): CoinApplyResult {
  if (amount === 0) return { balance, transaction: null };
  const next = balance + amount;
  if (next < 0) {
    return { balance, transaction: null, rejected: 'INSUFFICIENT_COINS' };
  }
  return {
    balance: next,
    transaction: {
      id: txId(),
      amount,
      reason,
      refId,
      balanceAfter: next,
      createdAt: atIso,
    },
  };
}

/** Whether a purchase is affordable and off-cooldown. */
export function canPurchase(
  balance: number,
  cost: number,
  lastPurchasedAt: string | null,
  cooldownHours: number,
  nowIso: string,
): { ok: boolean; reason?: string } {
  if (balance < cost) return { ok: false, reason: 'INSUFFICIENT_COINS' };
  if (lastPurchasedAt && cooldownHours > 0) {
    const elapsedH =
      (new Date(nowIso).getTime() - new Date(lastPurchasedAt).getTime()) / 3_600_000;
    if (elapsedH < cooldownHours) return { ok: false, reason: 'ON_COOLDOWN' };
  }
  return { ok: true };
}
