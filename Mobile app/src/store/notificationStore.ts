/**
 * SOLO OS — Notification preferences store.
 *
 * Holds individually-toggleable channel prefs + schedule times, persisted. Any
 * change re-derives the local schedule through the notification service.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '@/services/storage/persist';
import {
  requestPermissions, registerChannels, applySchedule, cancelAllSchedules,
} from '@/services/notifications/notifications';
import type { NotificationChannelId } from '@/services/notifications/channels';
import { CHANNEL_IDS } from '@/services/notifications/channels';
import { useGameStore } from './gameStore';

type ChannelMap = Record<NotificationChannelId, boolean>;

function allChannels(value: boolean): ChannelMap {
  return CHANNEL_IDS.reduce((acc, id) => {
    acc[id] = value;
    return acc;
  }, {} as ChannelMap);
}

interface NotificationState {
  /** Master switch — off cancels every scheduled notification. */
  masterEnabled: boolean;
  /** Whether OS permission has been granted (best-effort mirror). */
  permissionGranted: boolean;
  /** Focus Mode DND — suppresses all notifications while active. */
  focusDndActive: boolean;
  channels: ChannelMap;
  dailyMissionsTime: string;
  streakWarningTime: string;
  eveningReviewTime: string;

  /** Request permission, register channels, apply schedule. Call once on boot. */
  initialize: () => Promise<void>;
  setMasterEnabled: (v: boolean) => Promise<void>;
  toggleChannel: (id: NotificationChannelId) => Promise<void>;
  setTime: (key: 'dailyMissionsTime' | 'streakWarningTime' | 'eveningReviewTime', value: string) => Promise<void>;
  reschedule: () => Promise<void>;
  /** Activate/deactivate Focus DND mode. */
  setFocusDnd: (active: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      masterEnabled: true,
      permissionGranted: false,
      focusDndActive: false,
      channels: allChannels(true),
      dailyMissionsTime: '05:00',
      streakWarningTime: '20:00',
      eveningReviewTime: '21:00',

      initialize: async () => {
        const granted = await requestPermissions();
        set({ permissionGranted: granted });
        if (!granted) return;
        await registerChannels();
        await get().reschedule();
      },

      reschedule: async () => {
        const s = get();
        if (!s.masterEnabled || !s.permissionGranted) {
          await cancelAllSchedules();
          return;
        }
        await applySchedule({
          channels: s.channels,
          dailyMissionsTime: s.dailyMissionsTime,
          streakWarningTime: s.streakWarningTime,
          eveningReviewTime: s.eveningReviewTime,
          privacyMode: useGameStore.getState().profile.privacyMode,
        });
      },

      setMasterEnabled: async (v) => {
        set({ masterEnabled: v });
        if (v && !get().permissionGranted) {
          const granted = await requestPermissions();
          set({ permissionGranted: granted });
          if (granted) await registerChannels();
        }
        await get().reschedule();
      },

      toggleChannel: async (id) => {
        set((s) => ({ channels: { ...s.channels, [id]: !s.channels[id] } }));
        await get().reschedule();
      },

      setTime: async (key, value) => {
        set({ [key]: value } as Pick<NotificationState, typeof key>);
        await get().reschedule();
      },

      setFocusDnd: (active) => set({ focusDndActive: active }),
    }),
    {
      name: 'soloos-notifications-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({
        masterEnabled: s.masterEnabled,
        channels: s.channels,
        dailyMissionsTime: s.dailyMissionsTime,
        streakWarningTime: s.streakWarningTime,
        eveningReviewTime: s.eveningReviewTime,
      }),
    },
  ),
);
