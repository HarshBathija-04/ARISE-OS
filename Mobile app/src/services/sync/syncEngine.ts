/**
 * SOLO OS — Sync engine.
 *
 * Submits a single queued action to the shared backend (the Next.js website
 * REST API). Distinguishes:
 *   • network / transport failure → RETRY (stay queued, try again later)
 *   • server business rejection    → REVIEW (server refused; surface to user)
 *   • success                      → VALIDATED
 *
 * In local-only mode (no API configured, or signed out) there is no backend to
 * validate against, so actions are marked VALIDATED locally — the client store
 * is already authoritative in that mode. A successful action also nudges a
 * game-state snapshot push so the server mirror stays current.
 */
import { apiFetch, isApiEnabled, getToken } from '@/services/api/client';
import { pushSnapshot } from './snapshot';
import type { PendingAction, SubmitResult, SyncActionType } from './types';

/** Maps a queued action type to its REST endpoint path segment. */
const ENDPOINT_MAP: Record<SyncActionType, string> = {
  COMPLETE_MISSION: 'complete_mission',
  APPLY_BOSS_DAMAGE: 'apply_boss_damage',
  PURCHASE_REWARD: 'purchase_reward',
};

export async function submitAction(action: PendingAction): Promise<SubmitResult> {
  const token = isApiEnabled ? await getToken() : null;
  if (!isApiEnabled || !token) {
    // No backend / not signed in → the local store is authoritative.
    return { outcome: 'VALIDATED', note: 'Local authoritative (no backend configured).' };
  }

  const path = `/api/sync/${ENDPOINT_MAP[action.type]}`;
  const res = await apiFetch<{ ok: boolean; error?: string }>(path, {
    method: 'POST',
    body: action.payload,
  });

  if (res.ok) {
    // Fire-and-forget snapshot mirror; failures here don't affect the action.
    void pushSnapshot();
    return { outcome: 'VALIDATED', note: null };
  }
  if (res.transport) {
    return { outcome: 'RETRY', note: res.error };
  }
  return { outcome: 'REVIEW', note: res.error ?? 'Server rejected the action.' };
}
