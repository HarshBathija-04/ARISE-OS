/**
 * SOLO OS — Central game store (local-first, persisted).
 *
 * Holds the authoritative *client* game state and runs the core game loop
 * through the centralized engines. When Supabase is connected, completions are
 * also submitted to server RPCs (Phase 13 sync layer); the server remains the
 * source of truth. UI never calls engines directly — it calls store actions.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import type {
  PlayerProfile, AttributeState, Mission, CoinTransaction, SystemEvent,
  AttributeReward, FocusSession, FocusCategory, FocusObjectiveResult,
} from '@/types';
import { createInitialAttributes, applyAttributeXp } from '@/game-engine/attribute-engine';
import { processLevelIncrease, getLevelProgress } from '@/game-engine/level-engine';
import { applyCoins } from '@/game-engine/coin-engine';
import { applyAntiFarming } from '@/game-engine/anti-farming-engine';
import { computeFocusXp } from '@/game-engine/focus-engine';
import { defaultDailyMissions } from '@/game-engine/mission-engine';
import { todayIso, nowIso, isSameDay } from '@/utils/date';
import { useSyncStore } from './syncStore';

export interface CompletionOutcome {
  ok: boolean;
  error?: string;
  xpAwarded: number;
  coinsAwarded: number;
  attributeRewards: AttributeReward[];
  levelsGained: number;
  oldLevel: number;
  newLevel: number;
  rankChanged: boolean;
  antiFarmNote: string | null;
}

interface DailyTracker {
  date: string;
  xpEarned: number;
  activityCounts: Record<string, number>;
  recoveryXp: number;
  focusXp: number;
  focusSessions: number;
}

export interface FocusCompletionOutcome extends CompletionOutcome {
  session: FocusSession | null;
}

interface GameState {
  hydrated: boolean;
  profile: PlayerProfile;
  attributes: AttributeState[];
  missions: Mission[];
  transactions: CoinTransaction[];
  events: SystemEvent[];
  focusSessions: FocusSession[];
  daily: DailyTracker;

  // lifecycle
  setHydrated: (v: boolean) => void;
  ensureSeeded: () => void;
  ensureToday: () => void;
  resetAll: () => void;

  // profile
  completeOnboarding: () => void;
  setPrivacyMode: (v: boolean) => void;
  equipTitle: (key: string | null) => void;

  // mission loop
  initiateMission: (id: string) => void;
  updateMissionProgress: (id: string, progress: number) => void;
  abandonMission: (id: string) => void;
  completeMission: (id: string) => CompletionOutcome;

  // focus
  completeFocusSession: (input: {
    category: FocusCategory;
    objective: string;
    plannedMinutes: number;
    activeSeconds: number;
    result: FocusObjectiveResult;
  }) => FocusCompletionOutcome;

  // timetable
  completeTimetableBlock: (blockId: string, xpAmount: number) => CompletionOutcome;

  // events
  pushEvent: (e: Omit<SystemEvent, 'id' | 'createdAt'>) => void;
}

const DEFAULT_PROFILE: PlayerProfile = {
  id: 'local-player',
  displayName: 'Harsh Bathija',
  level: 1,
  rank: 'INITIATE',
  lifetimeXp: 0,
  coins: 0,
  equippedTitleKey: null,
  heightCm: 188,
  weightKg: 75,
  wakeTarget: '05:00',
  sleepTargetHours: 6,
  onboardingComplete: false,
  privacyMode: false,
  createdAt: nowIso(),
  updatedAt: nowIso(),
};

let eventCounter = 0;
function makeEvent(e: Omit<SystemEvent, 'id' | 'createdAt'>): SystemEvent {
  eventCounter += 1;
  return { ...e, id: `ev_${Date.now().toString(36)}_${eventCounter}`, createdAt: nowIso() };
}

function freshDaily(): DailyTracker {
  return {
    date: todayIso(), xpEarned: 0, activityCounts: {}, recoveryXp: 0,
    focusXp: 0, focusSessions: 0,
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      profile: DEFAULT_PROFILE,
      attributes: [],
      missions: [],
      transactions: [],
      events: [],
      focusSessions: [],
      daily: freshDaily(),

      setHydrated: (v) => set({ hydrated: v }),

      ensureSeeded: () => {
        const s = get();
        if (s.attributes.length === 0) {
          set({ attributes: createInitialAttributes() });
        }
        get().ensureToday();
      },

      ensureToday: () => {
        const s = get();
        const today = todayIso();
        // Roll the daily tracker at midnight.
        if (s.daily.date !== today) {
          set({ daily: freshDaily() });
        }
        // Generate today's missions if none exist for today.
        const hasToday = s.missions.some(
          (m) => m.type === 'DAILY' && isSameDay(m.createdAt, today),
        );
        if (!hasToday) {
          const generated = defaultDailyMissions(nowIso());
          // Keep any non-daily missions, replace stale dailies.
          const kept = s.missions.filter((m) => m.type !== 'DAILY');
          set({ missions: [...generated, ...kept] });
          if (s.profile.onboardingComplete) {
            get().pushEvent({
              type: 'SYSTEM',
              title: "TODAY'S MISSIONS AVAILABLE",
              detail: `${generated.length} missions generated.`,
            });
          }
        }
      },

      resetAll: () =>
        set({
          profile: { ...DEFAULT_PROFILE, createdAt: nowIso(), updatedAt: nowIso() },
          attributes: createInitialAttributes(),
          missions: defaultDailyMissions(nowIso()),
          transactions: [],
          events: [],
          focusSessions: [],
          daily: freshDaily(),
        }),

      completeOnboarding: () =>
        set((s) => ({
          profile: { ...s.profile, onboardingComplete: true, updatedAt: nowIso() },
        })),

      setPrivacyMode: (v) =>
        set((s) => ({ profile: { ...s.profile, privacyMode: v, updatedAt: nowIso() } })),

      equipTitle: (key) =>
        set((s) => ({ profile: { ...s.profile, equippedTitleKey: key, updatedAt: nowIso() } })),

      initiateMission: (id) =>
        set((s) => ({
          missions: s.missions.map((m) =>
            m.id === id && m.status === 'AVAILABLE'
              ? { ...m, status: 'ACTIVE', startDate: nowIso(), updatedAt: nowIso() }
              : m,
          ),
        })),

      updateMissionProgress: (id, progress) =>
        set((s) => ({
          missions: s.missions.map((m) =>
            m.id === id
              ? {
                  ...m,
                  currentProgress: Math.max(0, Math.min(m.targetValue, progress)),
                  updatedAt: nowIso(),
                }
              : m,
          ),
        })),

      abandonMission: (id) =>
        set((s) => ({
          missions: s.missions.map((m) =>
            m.id === id && (m.status === 'ACTIVE' || m.status === 'AVAILABLE')
              ? { ...m, status: 'FAILED', updatedAt: nowIso() }
              : m,
          ),
        })),

      completeMission: (id): CompletionOutcome => {
        const s = get();
        get().ensureToday();
        const mission = get().missions.find((m) => m.id === id);
        const empty: CompletionOutcome = {
          ok: false, xpAwarded: 0, coinsAwarded: 0, attributeRewards: [],
          levelsGained: 0, oldLevel: s.profile.level, newLevel: s.profile.level,
          rankChanged: false, antiFarmNote: null,
        };
        if (!mission) return { ...empty, error: 'MISSION_NOT_FOUND' };
        if (mission.status === 'COMPLETED') return { ...empty, error: 'ALREADY_COMPLETED' };

        const daily = get().daily;
        const at = nowIso();

        // 1. Anti-farming adjusts XP.
        const isRecovery = mission.type === 'RECOVERY';
        const { xp: finalXp, note } = applyAntiFarming(mission.xpReward, {
          xpEarnedToday: daily.xpEarned,
          sameActivityCountToday: daily.activityCounts[mission.activityType] ?? 0,
          recoveryXpToday: daily.recoveryXp,
          isRecovery,
        });

        // 2. Title XP bonus (max 5%) — resolved in Phase 9; profile holds key.
        const bonusXp = finalXp; // titles applied on server; local mirror keeps base

        // 3. Level engine.
        const lvl = processLevelIncrease(s.profile.lifetimeXp, bonusXp);

        // 4. Attributes.
        let attrs = s.attributes;
        for (const reward of mission.attributeRewards) {
          attrs = attrs.map((a) =>
            a.code === reward.code ? applyAttributeXp(a, reward.xp, at).next : a,
          );
        }

        // 5. Coins.
        const coinRes = applyCoins(
          s.profile.coins, mission.coinReward, 'MISSION', mission.id, at,
        );

        // 6. Persist.
        const newTransactions = coinRes.transaction
          ? [coinRes.transaction, ...s.transactions].slice(0, 500)
          : s.transactions;

        const updatedMissions = get().missions.map((m) =>
          m.id === id
            ? {
                ...m,
                status: 'COMPLETED' as const,
                currentProgress: m.targetValue,
                completedAt: at,
                updatedAt: at,
              }
            : m,
        );

        const newDaily: DailyTracker = {
          ...daily,
          xpEarned: daily.xpEarned + bonusXp,
          activityCounts: {
            ...daily.activityCounts,
            [mission.activityType]: (daily.activityCounts[mission.activityType] ?? 0) + 1,
          },
          recoveryXp: isRecovery ? daily.recoveryXp + bonusXp : daily.recoveryXp,
        };

        set({
          profile: {
            ...s.profile,
            lifetimeXp: lvl.newLifetimeXp,
            level: lvl.newLevel,
            rank: lvl.newRank,
            coins: coinRes.balance,
            updatedAt: at,
          },
          attributes: attrs,
          missions: updatedMissions,
          transactions: newTransactions,
          daily: newDaily,
        });

        // 7. System events.
        get().pushEvent({
          type: 'MISSION_COMPLETE',
          title: mission.title,
          detail: `Validated. +${bonusXp} XP`,
        });
        if (lvl.levelsGained > 0) {
          get().pushEvent({
            type: 'LEVEL_UP',
            title: 'LEVEL INCREASE',
            detail: `Level ${lvl.oldLevel} → ${lvl.newLevel}${lvl.rankChanged ? ` · ${lvl.newRank}` : ''}`,
          });
        }

        // 8. Mirror to the offline sync queue (server RPC when online).
        useSyncStore.getState().enqueue('COMPLETE_MISSION', { p_mission_id: mission.id });

        return {
          ok: true,
          xpAwarded: bonusXp,
          coinsAwarded: coinRes.transaction ? mission.coinReward : 0,
          attributeRewards: mission.attributeRewards,
          levelsGained: lvl.levelsGained,
          oldLevel: lvl.oldLevel,
          newLevel: lvl.newLevel,
          rankChanged: lvl.rankChanged,
          antiFarmNote: note,
        };
      },

      completeFocusSession: (input): FocusCompletionOutcome => {
        const s = get();
        get().ensureToday();
        const daily = get().daily;
        const at = nowIso();

        const empty: FocusCompletionOutcome = {
          ok: false, xpAwarded: 0, coinsAwarded: 0, attributeRewards: [],
          levelsGained: 0, oldLevel: s.profile.level, newLevel: s.profile.level,
          rankChanged: false, antiFarmNote: null, session: null,
        };

        // 1. Focus engine computes XP from ACTUAL active time.
        const focus = computeFocusXp(input.category, {
          activeSeconds: input.activeSeconds,
          result: input.result,
          sessionsToday: daily.focusSessions,
          focusXpToday: daily.focusXp,
        });

        const session: FocusSession = {
          id: `fs_${Date.now().toString(36)}`,
          category: input.category,
          objective: input.objective,
          plannedMinutes: input.plannedMinutes,
          activeSeconds: input.activeSeconds,
          result: input.result,
          xpAwarded: focus.xp,
          startedAt: new Date(Date.now() - input.activeSeconds * 1000).toISOString(),
          endedAt: at,
        };

        // No-XP session (too short): still record it, but no progression.
        if (focus.xp <= 0) {
          set((st) => ({ focusSessions: [session, ...st.focusSessions].slice(0, 300) }));
          get().pushEvent({
            type: 'FOCUS_COMPLETE',
            title: 'FOCUS SESSION',
            detail: focus.note ?? 'Session too short for XP.',
          });
          return { ...empty, ok: true, session, antiFarmNote: focus.note };
        }

        // 2. Level engine.
        const lvl = processLevelIncrease(s.profile.lifetimeXp, focus.xp);

        // 3. Attributes.
        let attrs = s.attributes;
        for (const reward of focus.attributeRewards) {
          attrs = attrs.map((a) =>
            a.code === reward.code ? applyAttributeXp(a, reward.xp, at).next : a,
          );
        }

        set({
          profile: {
            ...s.profile,
            lifetimeXp: lvl.newLifetimeXp,
            level: lvl.newLevel,
            rank: lvl.newRank,
            updatedAt: at,
          },
          attributes: attrs,
          focusSessions: [session, ...get().focusSessions].slice(0, 300),
          daily: {
            ...daily,
            xpEarned: daily.xpEarned + focus.xp,
            focusXp: daily.focusXp + focus.xp,
            focusSessions: daily.focusSessions + 1,
            activityCounts: {
              ...daily.activityCounts,
              FOCUS_SESSION: (daily.activityCounts.FOCUS_SESSION ?? 0) + 1,
            },
          },
        });

        get().pushEvent({
          type: 'FOCUS_COMPLETE',
          title: `FOCUS: ${input.category.replace('_', ' ')}`,
          detail: `${Math.round(input.activeSeconds / 60)} min · +${focus.xp} XP`,
        });
        if (lvl.levelsGained > 0) {
          get().pushEvent({
            type: 'LEVEL_UP',
            title: 'LEVEL INCREASE',
            detail: `Level ${lvl.oldLevel} → ${lvl.newLevel}`,
          });
        }

        return {
          ok: true,
          xpAwarded: focus.xp,
          coinsAwarded: 0,
          attributeRewards: focus.attributeRewards,
          levelsGained: lvl.levelsGained,
          oldLevel: lvl.oldLevel,
          newLevel: lvl.newLevel,
          rankChanged: lvl.rankChanged,
          antiFarmNote: focus.note,
          session,
        };
      },

      pushEvent: (e) =>
        set((s) => ({ events: [makeEvent(e), ...s.events].slice(0, 200) })),

      completeTimetableBlock: (blockId, xpAmount): CompletionOutcome => {
        const s = get();
        get().ensureToday();
        const daily = get().daily;
        const at = nowIso();

        const empty: CompletionOutcome = {
          ok: false, xpAwarded: 0, coinsAwarded: 0, attributeRewards: [],
          levelsGained: 0, oldLevel: s.profile.level, newLevel: s.profile.level,
          rankChanged: false, antiFarmNote: null,
        };

        if (xpAmount <= 0) return { ...empty, ok: true };

        // Anti-farming check
        const { xp: finalXp, note } = applyAntiFarming(xpAmount, {
          xpEarnedToday: daily.xpEarned,
          sameActivityCountToday: daily.activityCounts.TIMETABLE_BLOCK ?? 0,
          recoveryXpToday: daily.recoveryXp,
          isRecovery: false,
        });

        // Level engine
        const lvl = processLevelIncrease(s.profile.lifetimeXp, finalXp);

        // Persist
        set({
          profile: {
            ...s.profile,
            lifetimeXp: lvl.newLifetimeXp,
            level: lvl.newLevel,
            rank: lvl.newRank,
            updatedAt: at,
          },
          daily: {
            ...daily,
            xpEarned: daily.xpEarned + finalXp,
            activityCounts: {
              ...daily.activityCounts,
              TIMETABLE_BLOCK: (daily.activityCounts.TIMETABLE_BLOCK ?? 0) + 1,
            },
          },
        });

        get().pushEvent({
          type: 'MISSION_COMPLETE',
          title: 'TIMETABLE BLOCK COMPLETED',
          detail: `+${finalXp} XP`,
        });

        if (lvl.levelsGained > 0) {
          get().pushEvent({
            type: 'LEVEL_UP',
            title: 'LEVEL INCREASE',
            detail: `Level ${lvl.oldLevel} → ${lvl.newLevel}`,
          });
        }

        return {
          ok: true,
          xpAwarded: finalXp,
          coinsAwarded: 0,
          attributeRewards: [],
          levelsGained: lvl.levelsGained,
          oldLevel: lvl.oldLevel,
          newLevel: lvl.newLevel,
          rankChanged: lvl.rankChanged,
          antiFarmNote: note,
        };
      },
    }),
    {
      name: 'soloos-game-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({
        profile: s.profile,
        attributes: s.attributes,
        missions: s.missions,
        transactions: s.transactions,
        events: s.events,
        focusSessions: s.focusSessions,
        daily: s.daily,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

/** Selector helper: current level progress derived from profile. */
export function selectLevelProgress(s: GameState) {
  return getLevelProgress(s.profile.lifetimeXp);
}
