/**
 * SOLO OS — Boss definitions.
 * 6 initial bosses representing real-life problems.
 */
import type { Boss, ActivityType } from '@/types';

export interface BossDef {
  id: string;
  name: string;
  description: string;
  maxHp: number;
  weakness: ActivityType[];
  /** Human-readable weakness description. */
  weaknessDesc: string;
  /** Real-world objective to defeat. */
  objective: string;
  /** Estimated battle duration in days. */
  battleDays: number;
}

export const BOSS_DEFS: BossDef[] = [
  {
    id: 'boss_procrastinator',
    name: 'THE PROCRASTINATOR',
    description: 'The silent enemy. It convinces you that tomorrow is a better day. It never is.',
    maxHp: 200,
    weakness: ['DEEP_WORK', 'ROUTINE_COMPLETION'],
    weaknessDesc: 'Deep work sessions and routine completion.',
    objective: 'Complete 7 productive days.',
    battleDays: 10,
  },
  {
    id: 'boss_distraction',
    name: 'THE DISTRACTION BEAST',
    description: 'An endless stream of dopamine. Reels, shorts, feeds — it devours your focus.',
    maxHp: 250,
    weakness: ['NO_REELS', 'FOCUS_SESSION'],
    weaknessDesc: 'Digital silence and deep focus sessions.',
    objective: 'Maintain Digital Silence for 10 days.',
    battleDays: 14,
  },
  {
    id: 'boss_algorithm',
    name: 'THE ALGORITHM GUARDIAN',
    description: 'An ancient construct of logic. It tests your problem-solving resolve.',
    maxHp: 350,
    weakness: ['DSA', 'GATE_STUDY'],
    weaknessDesc: 'DSA problems and GATE study hours.',
    objective: 'Solve 50 DSA problems.',
    battleDays: 21,
  },
  {
    id: 'boss_gatekeeper',
    name: 'THE GATEKEEPER',
    description: 'The final examiner. It guards the path to the top IITs. Only relentless study breaks through.',
    maxHp: 500,
    weakness: ['GATE_STUDY', 'DSA', 'DEEP_WORK'],
    weaknessDesc: 'GATE study, DSA, and deep work sessions.',
    objective: 'Complete GATE subjects and PYQs.',
    battleDays: 30,
  },
  {
    id: 'boss_iron',
    name: 'THE IRON TRIAL',
    description: 'Your body resists change. Breaking through the physical barrier requires consistent effort.',
    maxHp: 300,
    weakness: ['WORKOUT', 'RUNNING'],
    weaknessDesc: 'Workouts and running sessions.',
    objective: 'Maintain physical training for 14 days.',
    battleDays: 18,
  },
  {
    id: 'boss_discipline',
    name: 'THE DISCIPLINE BREAKER',
    description: 'Entropy incarnate. It shatters routines, disrupts schedules, and breaks consistency.',
    maxHp: 400,
    weakness: ['ROUTINE_COMPLETION', 'WAKE_5AM', 'DEEP_WORK'],
    weaknessDesc: 'Routine completion, waking at 5 AM, and deep work.',
    objective: 'Maintain the core routine for 14 days.',
    battleDays: 21,
  },
];

export function createBossFromDef(def: BossDef): Boss {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    maxHp: def.maxHp,
    currentHp: def.maxHp,
    phase: 1,
    weakness: def.weakness,
    status: 'LOCKED',
    battleStartedAt: null,
    defeatedAt: null,
  };
}

export function createInitialBosses(): Boss[] {
  // First two bosses are immediately available.
  return BOSS_DEFS.map((def, i) => ({
    ...createBossFromDef(def),
    status: (i < 2 ? 'ACTIVE' : 'LOCKED') as Boss['status'],
    battleStartedAt: i < 2 ? new Date().toISOString() : null,
  }));
}

export function getBossDef(id: string): BossDef | undefined {
  return BOSS_DEFS.find((b) => b.id === id);
}
