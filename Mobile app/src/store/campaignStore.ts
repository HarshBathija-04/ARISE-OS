/**
 * SOLO OS — Campaign Store.
 * Tracks campaign stage progress (LOCKED/AVAILABLE/ACTIVE/MASTERED).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import { CAMPAIGNS, type CampaignId, type StageStatus } from '@/constants/campaigns';

export interface StageProgress {
  stageId: string;
  status: StageStatus;
  completedAt: string | null;
}

export interface CampaignProgress {
  campaignId: CampaignId;
  stages: StageProgress[];
}

interface CampaignState {
  campaigns: CampaignProgress[];
  ensureSeeded: () => void;
  setStageStatus: (campaignId: CampaignId, stageId: string, status: StageStatus) => void;
  masterStage: (campaignId: CampaignId, stageId: string) => void;
  getCampaignProgress: (campaignId: CampaignId) => CampaignProgress | undefined;
  getMasteredCount: () => number;
}

function createInitialProgress(): CampaignProgress[] {
  return CAMPAIGNS.map((c) => ({
    campaignId: c.id,
    stages: c.stages.map((s, i) => ({
      stageId: s.id,
      status: (i === 0 ? 'AVAILABLE' : 'LOCKED') as StageStatus,
      completedAt: null,
    })),
  }));
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      campaigns: [],

      ensureSeeded: () => {
        if (get().campaigns.length === 0) {
          set({ campaigns: createInitialProgress() });
        }
      },

      setStageStatus: (campaignId, stageId, status) => {
        set({
          campaigns: get().campaigns.map((c) =>
            c.campaignId === campaignId
              ? {
                  ...c,
                  stages: c.stages.map((s) =>
                    s.stageId === stageId ? { ...s, status } : s,
                  ),
                }
              : c,
          ),
        });
      },

      masterStage: (campaignId, stageId) => {
        const campaign = get().campaigns.find((c) => c.campaignId === campaignId);
        if (!campaign) return;

        const def = CAMPAIGNS.find((c) => c.id === campaignId);
        if (!def) return;

        const stageIdx = campaign.stages.findIndex((s) => s.stageId === stageId);
        if (stageIdx === -1) return;

        set({
          campaigns: get().campaigns.map((c) => {
            if (c.campaignId !== campaignId) return c;
            return {
              ...c,
              stages: c.stages.map((s, i) => {
                if (s.stageId === stageId) {
                  return { ...s, status: 'MASTERED' as StageStatus, completedAt: new Date().toISOString() };
                }
                // Unlock next stage.
                if (i === stageIdx + 1 && s.status === 'LOCKED') {
                  return { ...s, status: 'AVAILABLE' as StageStatus };
                }
                return s;
              }),
            };
          }),
        });
      },

      getCampaignProgress: (campaignId) => {
        return get().campaigns.find((c) => c.campaignId === campaignId);
      },

      getMasteredCount: () => {
        return get().campaigns.reduce(
          (total, c) => total + c.stages.filter((s) => s.status === 'MASTERED').length,
          0,
        );
      },
    }),
    {
      name: 'soloos-campaign-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({ campaigns: s.campaigns }),
    },
  ),
);
