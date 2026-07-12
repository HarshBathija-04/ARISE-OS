/**
 * SOLO OS — Offline sync types.
 *
 * The app is local-first: every progression action is applied to the client
 * store immediately, and a mirror of that action is queued here. When online
 * (and Supabase is configured), the queue is drained through server RPCs — the
 * server remains the source of truth and may accept (SYSTEM VALIDATED) or reject
 * (ACTION REQUIRES REVIEW) an action.
 */
export type SyncActionType =
  | 'COMPLETE_MISSION'
  | 'APPLY_BOSS_DAMAGE'
  | 'PURCHASE_REWARD';

export type SyncStatus =
  | 'PENDING' // queued, not yet sent
  | 'SYNCING' // in flight
  | 'VALIDATED' // server (or local) accepted
  | 'REVIEW' // server rejected — needs user review
  | 'FAILED'; // gave up after max attempts

export interface PendingAction {
  id: string;
  type: SyncActionType;
  /** RPC arguments, already in server (snake_case) shape. */
  payload: Record<string, unknown>;
  status: SyncStatus;
  attempts: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Human-facing label for a sync status (spec wording). */
export const SYNC_LABEL: Record<SyncStatus, string> = {
  PENDING: 'SYNC PENDING',
  SYNCING: 'SYNCING…',
  VALIDATED: 'SYSTEM VALIDATED',
  REVIEW: 'ACTION REQUIRES REVIEW',
  FAILED: 'SYNC FAILED',
};

/** Result of attempting to submit one action to the backend. */
export interface SubmitResult {
  outcome: 'VALIDATED' | 'REVIEW' | 'RETRY';
  note: string | null;
}
