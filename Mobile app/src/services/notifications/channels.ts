/**
 * SOLO OS — Notification channels.
 *
 * Android requires notification channels; each is individually toggleable in
 * the preferences screen. The RECOVERY channel is PRIVACY-CRITICAL: its text
 * must never name a sensitive shadow habit (see `privacyText`).
 */
import * as Notifications from 'expo-notifications';

export type NotificationChannelId =
  | 'DAILY_MISSIONS'
  | 'STREAK_WARNINGS'
  | 'FOCUS'
  | 'RECOVERY'
  | 'SYSTEM_EVENTS';

export interface ChannelDef {
  id: NotificationChannelId;
  name: string;
  description: string;
  importance: Notifications.AndroidImportance;
  /** Accent color used for the Android LED / small icon tint. */
  color: string;
}

export const CHANNELS: ChannelDef[] = [
  {
    id: 'DAILY_MISSIONS',
    name: 'Daily Missions',
    description: 'Morning mission drops and daily objective reminders.',
    importance: Notifications.AndroidImportance.HIGH,
    color: '#3B82F6',
  },
  {
    id: 'STREAK_WARNINGS',
    name: 'Streak Warnings',
    description: 'Alerts when an active streak is about to break.',
    importance: Notifications.AndroidImportance.HIGH,
    color: '#F5C542',
  },
  {
    id: 'FOCUS',
    name: 'Focus',
    description: 'Focus session prompts and deep-work nudges.',
    importance: Notifications.AndroidImportance.DEFAULT,
    color: '#22D3EE',
  },
  {
    id: 'RECOVERY',
    name: 'Recovery',
    description: 'Neutral, private check-ins for recovery protocols.',
    importance: Notifications.AndroidImportance.DEFAULT,
    color: '#8B5CF6',
  },
  {
    id: 'SYSTEM_EVENTS',
    name: 'System Events',
    description: 'Level ups, achievements, boss events, evening reviews.',
    importance: Notifications.AndroidImportance.DEFAULT,
    color: '#34D399',
  },
];

export const CHANNEL_IDS: NotificationChannelId[] = CHANNELS.map((c) => c.id);
