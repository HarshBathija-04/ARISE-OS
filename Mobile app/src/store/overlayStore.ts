/**
 * Global overlay store — drives full-screen cinematic overlays (level up,
 * achievement unlock, streak milestone) from anywhere without prop drilling.
 *
 * This store is imported by the UI and by the overlay components; it imports the
 * game/achievement stores (one-way — they never import it back), so there is no
 * cycle. On a completion it evaluates achievements from live store data and
 * queues any newly-unlocked ones for celebration.
 */
import { create } from 'zustand';
import type { CompletionOutcome } from './gameStore';
import { useGameStore } from './gameStore';
import { useAchievementStore } from './achievementStore';
import { getRankFromLevel } from '@/game-engine/level-engine';
import { createInitialMetrics, type PlayerMetrics } from '@/game-engine/achievement-engine';
import { toLocalDateKey } from '@/utils/date';

export interface LevelUpPayload {
  oldLevel: number;
  newLevel: number;
  newRank: string;
  rankChanged: boolean;
}

export interface AchievementPayload {
  name: string;
  description: string;
  rarity: string;
}

export interface MilestonePayload {
  streakLabel: string;
  days: number;
}

export interface CriticalImpactPayload {
  damage: number;
  bossName: string;
}

export interface TaskAlarmPayload {
  blockId: string;
  activity: string;
  category: string;
}

interface OverlayState {
  levelUp: LevelUpPayload | null;
  achievement: AchievementPayload | null;
  /** Additional unlocked achievements waiting their turn. */
  achievementQueue: AchievementPayload[];
  milestone: MilestonePayload | null;
  criticalImpact: CriticalImpactPayload | null;
  taskAlarm: TaskAlarmPayload | null;

  showLevelUp: (p: LevelUpPayload) => void;
  showAchievement: (p: AchievementPayload) => void;
  showMilestone: (p: MilestonePayload) => void;
  showCriticalImpact: (p: CriticalImpactPayload) => void;
  showTaskAlarm: (p: TaskAlarmPayload) => void;
  clearLevelUp: () => void;
  clearAchievement: () => void;
  clearMilestone: () => void;
  clearCriticalImpact: () => void;
  clearTaskAlarm: () => void;
  /** Convenience: react to a completion outcome (level-up + achievements). */
  handleCompletion: (o: CompletionOutcome) => void;
  /** Evaluate achievements from current store data; queue any new unlocks. */
  checkAchievements: () => void;
}

/** Assemble the metrics we can derive locally. Unknown metrics stay 0 (no false unlocks). */
function buildPlayerMetrics(): PlayerMetrics {
  const g = useGameStore.getState();
  const base = createInitialMetrics();
  const completed = g.missions.filter((m) => m.status === 'COMPLETED');
  const focusHours = g.focusSessions.reduce((s, f) => s + f.activeSeconds / 3600, 0);
  const activeDays = new Set(g.events.map((e) => toLocalDateKey(new Date(e.createdAt)))).size;

  return {
    ...base,
    level: g.profile.level,
    lifetime_xp: g.profile.lifetimeXp,
    lifetime_coins: g.transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    missions_completed: completed.length,
    active_days: activeDays,
    focus_sessions: g.focusSessions.length,
    focus_hours: Math.round(focusHours * 10) / 10,
    dsa_problems: completed.filter((m) => m.activityType === 'DSA').reduce((s, m) => s + m.targetValue, 0),
    workouts: completed.filter((m) => m.activityType === 'WORKOUT').length,
  };
}

export const useOverlayStore = create<OverlayState>((set, get) => ({
  levelUp: null,
  achievement: null,
  achievementQueue: [],
  milestone: null,
  criticalImpact: null,
  taskAlarm: null,

  showLevelUp: (p) => set({ levelUp: p }),
  showAchievement: (p) => set({ achievement: p }),
  showMilestone: (p) => set({ milestone: p }),
  showCriticalImpact: (p) => set({ criticalImpact: p }),
  showTaskAlarm: (p) => set({ taskAlarm: p }),
  clearLevelUp: () => set({ levelUp: null }),
  clearMilestone: () => set({ milestone: null }),
  clearCriticalImpact: () => set({ criticalImpact: null }),
  clearTaskAlarm: () => set({ taskAlarm: null }),

  clearAchievement: () =>
    set((s) => {
      const [next, ...rest] = s.achievementQueue;
      return next
        ? { achievement: next, achievementQueue: rest }
        : { achievement: null, achievementQueue: [] };
    }),

  handleCompletion: (o) => {
    if (o.levelsGained > 0) {
      set({
        levelUp: {
          oldLevel: o.oldLevel,
          newLevel: o.newLevel,
          newRank: getRankFromLevel(o.newLevel),
          rankChanged: o.rankChanged,
        },
      });
    }
    get().checkAchievements();
  },

  checkAchievements: () => {
    const unlocks = useAchievementStore.getState().evaluate(buildPlayerMetrics());
    if (unlocks.length === 0) return;
    const payloads: AchievementPayload[] = unlocks.map((u) => ({
      name: u.achievement.name,
      description: u.achievement.description,
      rarity: u.achievement.rarity,
    }));
    set((s) => {
      // If nothing is currently showing, pop the first; queue the rest.
      if (!s.achievement) {
        const [first, ...rest] = payloads;
        return { achievement: first, achievementQueue: [...s.achievementQueue, ...rest] };
      }
      return { achievementQueue: [...s.achievementQueue, ...payloads] };
    });
  },
}));
