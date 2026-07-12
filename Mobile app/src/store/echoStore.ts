/**
 * SOLO OS — ECHO store.
 *
 * Generates and persists ECHO's daily (morning/evening) and weekly reports.
 * Each report is computed deterministically by the `echo-engine` from live
 * store data, then narrated by the active AI provider (offline mock by default;
 * real providers go through the `echo` edge function which holds the key).
 *
 * Mirrors the spec's `daily_reports` / `weekly_reports` tables locally.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import {
  buildMorningReport, buildEveningReport, buildWeeklyReport,
  toNarrationRequest, type EchoReport, type EchoSnapshot,
} from '@/game-engine/echo-engine';
import { getAIProvider } from '@/services/ai';
import { useGameStore } from './gameStore';
import { useStreakStore } from './streakStore';
import { currentPerformance } from './selectors';
import { nowIso, todayIso } from '@/utils/date';

export interface StoredEchoReport {
  report: EchoReport;
  /** Narrative in ECHO's voice (provider output, or offline fallback). */
  narrative: string;
  provider: string;
  offline: boolean;
}

interface DailyReports {
  morning?: StoredEchoReport;
  evening?: StoredEchoReport;
}

interface EchoState {
  /** Keyed by local date (YYYY-MM-DD). */
  daily: Record<string, DailyReports>;
  /** Keyed by week-ending local date. */
  weekly: Record<string, StoredEchoReport>;
  lastGeneratedAt: string | null;
  generating: boolean;

  generateMorning: () => Promise<StoredEchoReport>;
  generateEvening: () => Promise<StoredEchoReport>;
  generateWeekly: () => Promise<StoredEchoReport>;
  getToday: () => DailyReports;
  getLatestWeekly: () => StoredEchoReport | null;
}

const MAX_DAILY_KEYS = 30;
const MAX_WEEKLY_KEYS = 12;

/** Assemble a privacy-safe snapshot from every relevant store. */
function collectSnapshot(): EchoSnapshot {
  const g = useGameStore.getState();
  const streaksState = useStreakStore.getState();
  const date = todayIso();
  const performance = currentPerformance();
  const dailyXp = g.daily.date === date ? g.daily.xpEarned : 0;

  return {
    date,
    generatedAt: nowIso(),
    profile: {
      displayName: g.profile.displayName,
      level: g.profile.level,
      rank: g.profile.rank,
      lifetimeXp: g.profile.lifetimeXp,
      coins: g.profile.coins,
      privacyMode: g.profile.privacyMode,
      sleepTargetHours: g.profile.sleepTargetHours,
      wakeTarget: g.profile.wakeTarget,
    },
    performance,
    missions: g.missions,
    focusSessions: g.focusSessions,
    streaks: streaksState.streaks,
    attributes: g.attributes,
    events: g.events,
    dailyXp,
  };
}

async function narrate(report: EchoReport): Promise<StoredEchoReport> {
  const provider = getAIProvider();
  const result = await provider.narrate(toNarrationRequest(report));
  return { report, narrative: result.text, provider: result.provider, offline: result.offline };
}

function trim<T>(record: Record<string, T>, max: number): Record<string, T> {
  const keys = Object.keys(record).sort(); // date keys sort chronologically
  if (keys.length <= max) return record;
  const keep = keys.slice(keys.length - max);
  const next: Record<string, T> = {};
  for (const k of keep) next[k] = record[k];
  return next;
}

export const useEchoStore = create<EchoState>()(
  persist(
    (set, get) => ({
      daily: {},
      weekly: {},
      lastGeneratedAt: null,
      generating: false,

      generateMorning: async () => {
        set({ generating: true });
        try {
          const snap = collectSnapshot();
          const stored = await narrate(buildMorningReport(snap));
          set((s) => ({
            daily: trim(
              { ...s.daily, [snap.date]: { ...s.daily[snap.date], morning: stored } },
              MAX_DAILY_KEYS,
            ),
            lastGeneratedAt: nowIso(),
          }));
          return stored;
        } finally {
          set({ generating: false });
        }
      },

      generateEvening: async () => {
        set({ generating: true });
        try {
          const snap = collectSnapshot();
          const stored = await narrate(buildEveningReport(snap));
          set((s) => ({
            daily: trim(
              { ...s.daily, [snap.date]: { ...s.daily[snap.date], evening: stored } },
              MAX_DAILY_KEYS,
            ),
            lastGeneratedAt: nowIso(),
          }));
          return stored;
        } finally {
          set({ generating: false });
        }
      },

      generateWeekly: async () => {
        set({ generating: true });
        try {
          const snap = collectSnapshot();
          const stored = await narrate(buildWeeklyReport(snap));
          set((s) => ({
            weekly: trim({ ...s.weekly, [snap.date]: stored }, MAX_WEEKLY_KEYS),
            lastGeneratedAt: nowIso(),
          }));
          return stored;
        } finally {
          set({ generating: false });
        }
      },

      getToday: () => get().daily[todayIso()] ?? {},

      getLatestWeekly: () => {
        const weekly = get().weekly;
        const keys = Object.keys(weekly).sort();
        return keys.length > 0 ? weekly[keys[keys.length - 1]] : null;
      },
    }),
    {
      name: 'soloos-echo-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({
        daily: s.daily,
        weekly: s.weekly,
        lastGeneratedAt: s.lastGeneratedAt,
      }),
    },
  ),
);
