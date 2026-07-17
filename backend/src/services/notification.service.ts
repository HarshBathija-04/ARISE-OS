/**
 * Notification creation + push fan-out. The raw inbox insert lives here;
 * xp.service.ts re-exports `notify` so existing call sites are untouched
 * (import direction: xp.service → notification.service, no cycles).
 */
import { db } from "../db/supabase.js";
import type { NotificationType, UserSettingsRow } from "../db/tables.js";
import type { NotificationAction } from "../engine/content/notification-templates.js";
import { sendToUser } from "./push.service.js";

/** Insert an in-app inbox notification (Realtime delivers it live). */
export async function insertNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body = "",
  meta?: Record<string, unknown>,
  dedupeKey?: string,
): Promise<string | null> {
  const { data, error } = await db
    .from("notifications")
    .insert({ user_id: userId, type, title, body, meta: meta ?? null, dedupe_key: dedupeKey ?? null })
    .select("id")
    .maybeSingle();
  if (error) {
    // Unique violation on (user_id, dedupe_key) = already delivered; treat as no-op.
    if (dedupeKey && error.code === "23505") return null;
    throw new Error(error.message);
  }
  return (data?.id as string) ?? null;
}

/** Minutes since local midnight for an instant in a timezone. */
export function minutesInTz(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return get("hour") * 60 + get("minute");
}

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Is `now` inside the user's Do-Not-Disturb window? Handles windows that
 * cross midnight (e.g. 22:00 → 07:00). Null/missing bounds = DND off.
 */
export function inDndWindow(
  settings: Pick<UserSettingsRow, "dnd_start" | "dnd_end" | "timezone">,
  now: Date = new Date(),
): boolean {
  if (!settings.dnd_start || !settings.dnd_end) return false;
  const start = parseHHMM(settings.dnd_start);
  const end = parseHHMM(settings.dnd_end);
  if (start === null || end === null || start === end) return false;
  const cur = minutesInTz(now, settings.timezone || "Asia/Kolkata");
  return start < end ? cur >= start && cur < end : cur >= start || cur < end;
}

const QUEST_TYPES: NotificationType[] = ["QUEST_GENERATED", "DAILY_RESET", "EVENING_REMINDER"];

export interface NotifyPushOptions {
  /** Force-skip the push leg (inbox row still written). */
  push?: boolean;
  dedupeKey?: string;
  deeplink?: string;
  actions?: readonly NotificationAction[];
  /** scheduled_notifications row that produced this, for analytics linkage. */
  scheduledId?: string;
  /** Collapse tag so a newer push replaces an older one. */
  tag?: string;
}

/**
 * Inbox insert + (preference-gated) FCM push. DND applies to pushes and
 * reminders only — native timetable alarms are governed on-device by
 * timetable_alarms_enabled and never routed through here.
 */
export async function notifyAndPush(
  userId: string,
  type: NotificationType,
  title: string,
  body = "",
  meta?: Record<string, unknown>,
  opts: NotifyPushOptions = {},
): Promise<{ notificationId: string | null; pushed: number }> {
  const notificationId = await insertNotification(userId, type, title, body, meta, opts.dedupeKey);
  if (opts.dedupeKey && notificationId === null) return { notificationId: null, pushed: 0 }; // duplicate

  if (opts.push === false) return { notificationId, pushed: 0 };

  const { data: settings, error } = await db
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const s = settings as UserSettingsRow | null;
  if (!s || !s.push_enabled) return { notificationId, pushed: 0 };
  if (QUEST_TYPES.includes(type) && !s.quest_push_enabled) return { notificationId, pushed: 0 };
  if (inDndWindow(s)) return { notificationId, pushed: 0 };

  const pushed = await sendToUser(userId, {
    title,
    body,
    deeplink: opts.deeplink,
    notificationId: notificationId ?? undefined,
    scheduledId: opts.scheduledId,
    actions: opts.actions,
    tag: opts.tag,
  });
  return { notificationId, pushed };
}
