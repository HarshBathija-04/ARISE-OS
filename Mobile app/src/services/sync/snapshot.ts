/**
 * SOLO OS — game-state snapshot sync.
 *
 * Pushes/pulls a per-user JSON snapshot of the local game + timetable stores to
 * the shared backend (`/api/state`) so progress follows the player across
 * devices. The local Zustand stores stay authoritative offline; this simply
 * mirrors them when signed in.
 */
import { apiFetch, getToken, isApiEnabled } from '@/services/api/client';
import { useGameStore } from '@/store/gameStore';

const REVISION_KEY = 'soloos_snapshot_revision';
let revision = 0;

interface SnapshotBody {
  data: {
    game: unknown;
  };
  revision: number;
}

/**
 * Collect the serialisable slice of the local game store.
 *
 * Note: the timetable is NOT part of the snapshot — it is fully relational and
 * synced through `/api/timetable*` (see src/services/api/timetable.ts).
 */
function collect(): SnapshotBody['data'] {
  const g = useGameStore.getState();
  return {
    game: {
      profile: g.profile,
      attributes: g.attributes,
      missions: g.missions,
      transactions: g.transactions,
      focusSessions: g.focusSessions,
      daily: g.daily,
    },
  };
}

/** Whether snapshot sync is possible right now (configured + signed in). */
export async function canSync(): Promise<boolean> {
  if (!isApiEnabled) return false;
  return (await getToken()) !== null;
}

/** Push the current local state. Bumps revision on success. Best-effort. */
export async function pushSnapshot(): Promise<{ ok: boolean; error?: string }> {
  if (!(await canSync())) return { ok: false, error: 'offline' };
  const next = revision + 1;
  const res = await apiFetch<{ ok: boolean; revision: number }>('/api/state', {
    method: 'PUT',
    body: { data: collect(), revision: next },
  });
  if (res.ok && res.data) {
    revision = res.data.revision;
    return { ok: true };
  }
  // On a stale-revision conflict the server returns its revision; adopt it.
  const serverRev = (res.data as { snapshot?: { revision?: number } })?.snapshot?.revision;
  if (typeof serverRev === 'number') revision = serverRev;
  return { ok: false, error: res.error ?? 'push failed' };
}

/**
 * Pull the server snapshot and hydrate the local stores if the server has data.
 * Called after login / on foreground. Returns whether local state was replaced.
 */
export async function pullSnapshot(): Promise<{ ok: boolean; applied: boolean }> {
  if (!(await canSync())) return { ok: false, applied: false };
  const res = await apiFetch<{
    ok: boolean;
    snapshot: { data: SnapshotBody['data']; revision: number } | null;
  }>('/api/state', { method: 'GET' });
  if (!res.ok || !res.data?.snapshot) return { ok: res.ok, applied: false };

  const { data, revision: serverRev } = res.data.snapshot;
  revision = serverRev;

  try {
    const game = data.game as Record<string, unknown>;
    if (game) useGameStore.setState(game);
    return { ok: true, applied: true };
  } catch {
    return { ok: true, applied: false };
  }
}

export { REVISION_KEY };
