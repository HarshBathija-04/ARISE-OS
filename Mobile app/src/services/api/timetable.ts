/**
 * SOLO OS — timetable REST sync.
 *
 * When signed in, the mobile timetable operates on the SAME relational rows as
 * the website (blocks, per-day states, study logs). These helpers wrap the
 * `/api/timetable*` endpoints. All no-op cleanly when signed out / offline.
 */
import { apiFetch, getToken, isApiEnabled } from './client';
import type { TimetableBlock, TimetableBlockState } from '@/constants/timetable';

export async function canSyncTimetable(): Promise<boolean> {
  if (!isApiEnabled) return false;
  return (await getToken()) !== null;
}

interface ServerBlock {
  id: string;
  order: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  activity: string;
  category: TimetableBlock['category'];
  xpReward: number;
}

function toLocal(b: ServerBlock): TimetableBlock {
  return {
    id: b.id,
    startHour: b.startHour,
    startMin: b.startMin,
    endHour: b.endHour,
    endMin: b.endMin,
    activity: b.activity,
    category: b.category,
    xpReward: b.xpReward,
  };
}

/** Fetch the server schedule + today's states, mapped to the local shape. */
export async function fetchTimetable(): Promise<{
  blocks: TimetableBlock[];
  states: Record<string, TimetableBlockState>;
} | null> {
  const res = await apiFetch<{ ok: boolean; blocks: ServerBlock[]; states: Record<string, TimetableBlockState> }>(
    '/api/timetable',
  );
  if (!res.ok || !res.data) return null;
  return { blocks: res.data.blocks.map(toLocal), states: res.data.states ?? {} };
}

/** Mirror a block's runtime state to the server. */
export async function pushBlockState(blockId: string, state: TimetableBlockState): Promise<void> {
  await apiFetch('/api/timetable/state', { method: 'POST', body: { blockId, state } });
}

/** Mirror a study session to the server. */
export async function pushStudy(input: {
  blockId: string;
  subject: string;
  durationMinutes: number;
  deepWorkScore: number;
  distractions: number;
  notes?: string;
  missionLinked?: string;
}): Promise<void> {
  await apiFetch('/api/timetable/study', { method: 'POST', body: input });
}

/** Replace the whole server schedule from local blocks; returns the re-read set. */
export async function pushSchedule(blocks: TimetableBlock[]): Promise<{
  blocks: TimetableBlock[];
  states: Record<string, TimetableBlockState>;
} | null> {
  const body = {
    blocks: blocks.map((b, i) => ({
      order: i,
      startHour: b.startHour,
      startMin: b.startMin,
      endHour: b.endHour,
      endMin: b.endMin,
      activity: b.activity,
      category: b.category,
      xpReward: b.xpReward,
    })),
  };
  const res = await apiFetch<{ ok: boolean }>('/api/timetable', { method: 'PUT', body });
  if (!res.ok) return null;
  // Re-read so local IDs match the freshly-created server rows.
  return fetchTimetable();
}
