/**
 * SOLO OS — Timetable store.
 *
 * Manages daily schedule blocks, their runtime states, study logs,
 * overtime detection, and XP integration with the game store.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import {
  DEFAULT_TIMETABLE,
  isCurrentBlock,
  isBlockPast,
  getOvertimeMinutes,
  type TimetableBlock,
  type TimetableBlockState,
  type TimetableCategory,
  type StudySubject,
} from '@/constants/timetable';
import { todayIso } from '@/utils/date';
import {
  canSyncTimetable, fetchTimetable, pushBlockState, pushStudy, pushSchedule,
} from '@/services/api/timetable';

export interface StudyLog {
  id: string;
  blockId: string;
  subject: StudySubject | string;
  durationMinutes: number;
  deepWorkScore: number; // 1-10
  distractions: number;
  notes: string;
  missionLinked: string;
  xpEarned: number;
  createdAt: string;
}

interface TimetableState {
  /** Today's schedule blocks (editable copy of the template). */
  blocks: TimetableBlock[];
  /** Runtime state for each block by ID. */
  blockStates: Record<string, TimetableBlockState>;
  /** Study session logs. */
  studyLogs: StudyLog[];
  /** Overtime warnings acknowledged by the user. */
  overtimeAcked: Record<string, boolean>;
  /** Blocks that have already triggered an alarm today (id -> date string). */
  alarmedBlocks: Record<string, string>;
  /** Date tracker to reset daily. */
  lastResetDate: string;
  /** Whether editing mode is active. */
  editing: boolean;
  /** True when blocks/states are synced with the shared backend (signed in). */
  remote: boolean;

  // ── Actions ──────────────────────────────────────────────────
  /** Ensure blocks are fresh for today. */
  ensureToday: () => void;
  /** Pull the server schedule + states when signed in. Returns true if applied. */
  hydrateFromServer: () => Promise<boolean>;
  /** Get the block matching the current time (or null). */
  getCurrentBlock: () => TimetableBlock | null;
  /** Compute the runtime state for a block based on time + explicit states. */
  computeBlockState: (blockId: string) => TimetableBlockState;
  /** Explicitly mark a block state. */
  setBlockState: (blockId: string, state: TimetableBlockState) => void;
  /** Mirror the current state of a block to the backend when remote. */
  mirrorState: (blockId: string) => void;
  /** Start a block (mark as ACTIVE). */
  startBlock: (blockId: string) => void;
  /** Complete a block. */
  completeBlock: (blockId: string) => void;
  /** Skip a block. */
  skipBlock: (blockId: string) => void;
  /** Pause a block. */
  pauseBlock: (blockId: string) => void;
  /** Check for overtime on any active/completed block. */
  getOvertimeBlock: () => { block: TimetableBlock; minutes: number } | null;
  /** Acknowledge an overtime warning. */
  ackOvertime: (blockId: string) => void;
  /** Add a new block. */
  addBlock: (block: Omit<TimetableBlock, 'id'>) => void;
  /** Delete a block. */
  deleteBlock: (blockId: string) => void;
  /** Edit a block. */
  editBlock: (blockId: string, updates: Partial<TimetableBlock>) => void;
  /** Push the full local schedule to the backend when remote, then re-sync ids. */
  syncSchedule: () => void;
  /** Toggle editing mode. */
  toggleEditing: () => void;
  /** Log a study session. */
  logStudy: (log: Omit<StudyLog, 'id' | 'createdAt'>) => void;
  /** Check if any block should trigger an alarm popup right now. */
  checkAlarms: () => void;
  /** Reset to defaults. */
  resetToDefaults: () => void;
}

export const useTimetableStore = create<TimetableState>()(
  persist(
    (set, get) => ({
      blocks: [...DEFAULT_TIMETABLE],
      blockStates: {},
      studyLogs: [],
      overtimeAcked: {},
      alarmedBlocks: {},
      lastResetDate: todayIso(),
      editing: false,
      remote: false,

      ensureToday: () => {
        const today = todayIso();
        if (get().lastResetDate !== today) {
          // Reset block states for a new day, keep the schedule template.
          set({
            blockStates: {},
            overtimeAcked: {},
            alarmedBlocks: {},
            lastResetDate: today,
          });
        }
      },

      hydrateFromServer: async () => {
        if (!(await canSyncTimetable())) {
          set({ remote: false });
          return false;
        }
        const data = await fetchTimetable();
        if (!data) return false;
        set({
          blocks: data.blocks,
          blockStates: data.states,
          overtimeAcked: {},
          lastResetDate: todayIso(),
          remote: true,
        });
        return true;
      },

      getCurrentBlock: () => {
        const now = new Date();
        return get().blocks.find((b) => isCurrentBlock(b, now)) ?? null;
      },

      computeBlockState: (blockId) => {
        const explicit = get().blockStates[blockId];
        if (explicit) return explicit;

        const block = get().blocks.find((b) => b.id === blockId);
        if (!block) return 'UPCOMING';

        const now = new Date();
        if (isCurrentBlock(block, now)) return 'ACTIVE';
        if (isBlockPast(block, now)) return 'MISSED';
        return 'UPCOMING';
      },

      setBlockState: (blockId, state) =>
        set((s) => ({
          blockStates: { ...s.blockStates, [blockId]: state },
        })),

      startBlock: (blockId) => {
        set((s) => ({
          blockStates: { ...s.blockStates, [blockId]: 'ACTIVE' as const },
        }));
        get().mirrorState(blockId);
      },

      completeBlock: (blockId) => {
        set((s) => {
          const block = s.blocks.find((b) => b.id === blockId);
          if (!block) return s;
          const now = new Date();
          const isEarly = !isBlockPast(block, now);
          return {
            blockStates: {
              ...s.blockStates,
              [blockId]: isEarly ? 'FINISHED_EARLY' : 'COMPLETED',
            },
          };
        });
        get().mirrorState(blockId);
      },

      skipBlock: (blockId) => {
        set((s) => ({
          blockStates: { ...s.blockStates, [blockId]: 'SKIPPED' as const },
        }));
        get().mirrorState(blockId);
      },

      pauseBlock: (blockId) => {
        set((s) => ({
          blockStates: { ...s.blockStates, [blockId]: 'PAUSED' as const },
        }));
        get().mirrorState(blockId);
      },

      mirrorState: (blockId) => {
        if (!get().remote) return;
        const state = get().blockStates[blockId];
        if (state) void pushBlockState(blockId, state);
      },

      getOvertimeBlock: () => {
        const { blocks, blockStates, overtimeAcked } = get();
        const now = new Date();
        for (const block of blocks) {
          const state = blockStates[block.id];
          if (state === 'ACTIVE' || (!state && isCurrentBlock(block, now))) {
            const overtime = getOvertimeMinutes(block, now);
            if (overtime > 0 && !overtimeAcked[block.id]) {
              return { block, minutes: overtime };
            }
          }
        }
        return null;
      },

      ackOvertime: (blockId) =>
        set((s) => ({
          overtimeAcked: { ...s.overtimeAcked, [blockId]: true },
        })),

      addBlock: (blockData) => {
        const id = `tt-custom-${Date.now().toString(36)}`;
        const block: TimetableBlock = { ...blockData, id };
        set((s) => {
          const updated = [...s.blocks, block].sort(
            (a, b) => (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin),
          );
          return { blocks: updated };
        });
        get().syncSchedule();
      },

      deleteBlock: (blockId) => {
        set((s) => ({
          blocks: s.blocks.filter((b) => b.id !== blockId),
        }));
        get().syncSchedule();
      },

      editBlock: (blockId, updates) => {
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === blockId ? { ...b, ...updates } : b,
          ),
        }));
        get().syncSchedule();
      },

      syncSchedule: () => {
        if (!get().remote) return;
        void (async () => {
          const data = await pushSchedule(get().blocks);
          // Re-read so local IDs match the server rows (createMany assigns new ids).
          if (data) set({ blocks: data.blocks, blockStates: data.states });
        })();
      },

      toggleEditing: () => set((s) => ({ editing: !s.editing })),

      logStudy: (log) => {
        const entry: StudyLog = {
          ...log,
          id: `sl_${Date.now().toString(36)}`,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          studyLogs: [entry, ...s.studyLogs].slice(0, 500),
        }));
        if (get().remote) {
          void pushStudy({
            blockId: log.blockId,
            subject: String(log.subject),
            durationMinutes: log.durationMinutes,
            deepWorkScore: log.deepWorkScore,
            distractions: log.distractions,
            notes: log.notes,
            missionLinked: log.missionLinked,
          });
        }
      },

      checkAlarms: () => {
        const { blocks, alarmedBlocks } = get();
        const now = new Date();
        const today = todayIso();
        for (const block of blocks) {
          if (isCurrentBlock(block, now)) {
            if (alarmedBlocks[block.id] !== today) {
              set((s) => ({
                alarmedBlocks: { ...s.alarmedBlocks, [block.id]: today },
              }));
              // Trigger overlay popup
              // Delay require to avoid circular dependency
              const overlayStore = require('./overlayStore').useOverlayStore;
              overlayStore.getState().showTaskAlarm({
                blockId: block.id,
                activity: block.activity,
                category: block.category,
              });
            }
          }
        }
      },

      resetToDefaults: () => {
        set({
          blocks: [...DEFAULT_TIMETABLE],
          blockStates: {},
          studyLogs: [],
          overtimeAcked: {},
          alarmedBlocks: {},
          lastResetDate: todayIso(),
        });
        get().syncSchedule();
      },
    }),
    {
      name: 'soloos-timetable-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({
        blocks: s.blocks,
        blockStates: s.blockStates,
        studyLogs: s.studyLogs,
        overtimeAcked: s.overtimeAcked,
        alarmedBlocks: s.alarmedBlocks,
        lastResetDate: s.lastResetDate,
      }),
    },
  ),
);
