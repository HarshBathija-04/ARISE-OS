/**
 * SOLO OS — Local notification service.
 *
 * Local-only scheduling today; the architecture is push-ready (a device token
 * getter is exposed for a future server-push layer). Every call is defensive —
 * failures (denied permission, unsupported platform, Expo Go limits) degrade to
 * a no-op so the app never crashes.
 *
 * PRIVACY: notification bodies never name a sensitive shadow habit. Recovery
 * content is routed through `privacyText()`, which neutralizes the copy whenever
 * Privacy Mode is on.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CHANNELS, type NotificationChannelId } from './channels';

// Banner + list, no sound by default — this is a calm system, not a nag.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Stable identifiers so re-scheduling can cancel prior instances precisely. */
const SCHEDULE_IDS = {
  dailyMissions: 'soloos-daily-missions',
  streakWarning: 'soloos-streak-warning',
  eveningReview: 'soloos-evening-review',
} as const;

function parseTime(hhmm: string, fallbackHour: number, fallbackMinute = 0): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m) return { hour: fallbackHour, minute: fallbackMinute };
  const hour = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const minute = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return { hour, minute };
}

async function silently<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/** Ask for permission. Returns true if we may post notifications. */
export async function requestPermissions(): Promise<boolean> {
  const res = await silently(async () => {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  });
  return res === true;
}

/** Register all Android channels (no-op on iOS). */
export async function registerChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const ch of CHANNELS) {
    await silently(() =>
      Notifications.setNotificationChannelAsync(ch.id, {
        name: ch.name,
        description: ch.description,
        importance: ch.importance,
        lightColor: ch.color,
      }),
    );
  }
}

/**
 * Push-ready hook. Returns a device push token when available, else null.
 * Local notifications work without this; a future server can use the token.
 */
export async function getPushToken(): Promise<string | null> {
  const res = await silently(async () => {
    const token = await Notifications.getDevicePushTokenAsync();
    return token?.data ?? null;
  });
  return res ?? null;
}

interface DailyScheduleInput {
  hour: number;
  minute: number;
  channelId: NotificationChannelId;
  title: string;
  body: string;
  identifier: string;
}

async function scheduleDaily(input: DailyScheduleInput): Promise<void> {
  await silently(() => Notifications.cancelScheduledNotificationAsync(input.identifier));
  await silently(() =>
    Notifications.scheduleNotificationAsync({
      identifier: input.identifier,
      content: {
        title: input.title,
        body: input.body,
        ...(Platform.OS === 'android' ? { channelId: input.channelId } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: input.hour,
        minute: input.minute,
      },
    }),
  );
}

export interface ScheduleConfig {
  channels: Record<NotificationChannelId, boolean>;
  dailyMissionsTime: string; // "05:00"
  streakWarningTime: string; // "20:00"
  eveningReviewTime: string; // "21:00"
  privacyMode: boolean;
}

/** Cancel everything SOLO OS has scheduled. */
export async function cancelAllSchedules(): Promise<void> {
  for (const id of Object.values(SCHEDULE_IDS)) {
    await silently(() => Notifications.cancelScheduledNotificationAsync(id));
  }
}

/**
 * Re-derive the full local schedule from preferences. Only enabled channels are
 * scheduled; disabled ones are cancelled.
 */
export async function applySchedule(cfg: ScheduleConfig): Promise<void> {
  await cancelAllSchedules();

  if (cfg.channels.DAILY_MISSIONS) {
    const t = parseTime(cfg.dailyMissionsTime, 5, 0);
    await scheduleDaily({
      ...t,
      channelId: 'DAILY_MISSIONS',
      title: 'SYSTEM // DAILY MISSIONS',
      body: "Today's objectives are live. Open SOLO OS to begin progression.",
      identifier: SCHEDULE_IDS.dailyMissions,
    });
  }

  if (cfg.channels.STREAK_WARNINGS) {
    const t = parseTime(cfg.streakWarningTime, 20, 0);
    await scheduleDaily({
      ...t,
      channelId: 'STREAK_WARNINGS',
      title: 'SYSTEM // STREAK RISK',
      body: 'One or more streaks are unadvanced today. Act before midnight to keep the chain alive.',
      identifier: SCHEDULE_IDS.streakWarning,
    });
  }

  if (cfg.channels.SYSTEM_EVENTS) {
    const t = parseTime(cfg.eveningReviewTime, 21, 0);
    await scheduleDaily({
      ...t,
      channelId: 'SYSTEM_EVENTS',
      title: 'ECHO // EVENING REVIEW',
      body: 'The day cycle is closing. Review your deltas and prep tomorrow.',
      identifier: SCHEDULE_IDS.eveningReview,
    });
  }
}

/**
 * Privacy-safe copy. When Privacy Mode is on (or the source is sensitive), the
 * body is replaced with neutral text that reveals nothing.
 */
export function privacyText(
  body: string,
  opts: { sensitive: boolean; privacyMode: boolean },
): string {
  if (opts.privacyMode || opts.sensitive) {
    return 'A protected protocol needs your attention.';
  }
  return body;
}

/** Fire an immediate local notification (used for live SYSTEM events). */
export async function notifyNow(
  channelId: NotificationChannelId,
  title: string,
  body: string,
): Promise<void> {
  // Suppress notifications when Focus DND is active.
  try {
    const { useNotificationStore } = await import('@/store/notificationStore');
    if (useNotificationStore.getState().focusDndActive) return;
  } catch {}

  await silently(() =>
    Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null, // immediate
    }),
  );
}

/**
 * Open system DND / Do Not Disturb settings.
 * On Android this opens the notification policy access screen.
 * On iOS there's no deep link to Focus settings, so we fall back to general settings.
 */
export async function promptSystemDnd(): Promise<void> {
  const { Linking } = await import('react-native');
  try {
    if (Platform.OS === 'android') {
      await Linking.openSettings();
    } else {
      await Linking.openSettings();
    }
  } catch {}
}
