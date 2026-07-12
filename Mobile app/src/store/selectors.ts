/**
 * Derived selectors over the game store. Keeps components declarative and
 * moves all computation out of the UI layer.
 */
import type { Mission } from '@/types';
import { computePerformance, type PerformanceInput } from '@/game-engine/performance-engine';
import { todayIso, isSameDay } from '@/utils/date';
import { useGameStore } from './gameStore';

export function todaysMissions(missions: Mission[]): Mission[] {
  const today = todayIso();
  return missions.filter(
    (m) => (m.type === 'DAILY' || m.type === 'RECOVERY') && isSameDay(m.createdAt, today),
  );
}

export function primaryMission(missions: Mission[]): Mission | null {
  const today = todaysMissions(missions);
  // Prefer an active mission, else the highest-value incomplete daily.
  const active = today.find((m) => m.status === 'ACTIVE');
  if (active) return active;
  const incomplete = today
    .filter((m) => m.status === 'AVAILABLE')
    .sort((a, b) => b.xpReward - a.xpReward);
  return incomplete[0] ?? null;
}

export function dailyCompletionRate(missions: Mission[]): number {
  const today = todaysMissions(missions).filter((m) => m.type === 'DAILY');
  if (today.length === 0) return 0;
  const done = today.filter((m) => m.status === 'COMPLETED').length;
  return done / today.length;
}

/**
 * Build a PerformanceInput from current store data. Until 30 days of history
 * accrue, we approximate windows from today's completion + lifetime signals so
 * the score is meaningful from day one (and improves as data grows).
 */
export function buildPerformanceInput(): PerformanceInput {
  const s = useGameStore.getState();
  const missions = s.missions;
  const today = todaysMissions(missions);

  const rateFor = (cats: string[]) => {
    const set = today.filter((m) => cats.includes(m.category));
    if (set.length === 0) return 50; // neutral baseline
    const done = set.filter((m) => m.status === 'COMPLETED').length;
    return Math.round((done / set.length) * 100);
  };

  const disc = rateFor(['DISCIPLINE']);
  const know = rateFor(['GATE', 'DSA', 'AI_ML', 'FULL_STACK', 'SYSTEM_DESIGN', 'DATA_SCIENCE']);
  const phys = rateFor(['PHYSICAL']);
  const foc = rateFor(['FOCUS']);
  const rec = rateFor(['RECOVERY']);

  const win = (v: number) => ({ recent7: v, previous23: 50 });
  return {
    discipline: win(disc),
    knowledge: win(know),
    physical: win(phys),
    focus: win(foc),
    recovery: win(rec),
  };
}

export function currentPerformance() {
  return computePerformance(buildPerformanceInput());
}
