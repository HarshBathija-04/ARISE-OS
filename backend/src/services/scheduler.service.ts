/**
 * Scheduled-notification engine. A minutely tick does two idempotent phases:
 *
 *   A) MATERIALIZE — insert today's scheduled_notifications rows per user
 *      (daily reset, evening reminder, web timetable pre-reminders) computed
 *      in the user's timezone. The unique (user_id, dedupe_key) index makes
 *      re-inserts no-ops, so this can run every tick safely.
 *   B) DISPATCH — deliver every PENDING row whose fire_at has passed.
 *
 * Chosen over per-event setTimeout: survives process restarts, and the
 * secret-protected internal endpoint can drive it externally when
 * CRON_ENABLED=false.
 */
import { db } from "../db/supabase.js";
import { dayKey, gameDay, localTimeToUtcInstant } from "../engine/date.js";
import type {
  ScheduledNotificationRow,
  TimetableBlockRow,
  TimetableDayType,
  UserSettingsRow,
} from "../db/tables.js";
import {
  TEMPLATES,
  categoryEmoji,
  fill,
} from "../engine/content/notification-templates.js";
import { notifyAndPush } from "./notification.service.js";
import { runDailyResetForUser } from "./daily-reset.service.js";

interface UserWithSettings {
  id: string;
  settings: UserSettingsRow | null;
}

let userCache: { at: number; users: UserWithSettings[] } | null = null;
const USER_CACHE_MS = 5 * 60 * 1000;

async function allUsers(): Promise<UserWithSettings[]> {
  if (userCache && Date.now() - userCache.at < USER_CACHE_MS) return userCache.users;
  const { data, error } = await db.from("users").select("id, user_settings(*)");
  if (error) throw new Error(error.message);
  const users = (data ?? []).map((u) => ({
    id: u.id as string,
    settings: (Array.isArray(u.user_settings)
      ? u.user_settings[0]
      : u.user_settings) as UserSettingsRow | null,
  }));
  userCache = { at: Date.now(), users };
  return users;
}

/** Test seam. */
export function _clearUserCacheForTests() {
  userCache = null;
}

function tzOf(s: UserSettingsRow | null): string {
  return s?.timezone || "Asia/Kolkata";
}

/** Which timetable day-type applies for a calendar day (server heuristic for web reminders). */
function dayTypeFor(dayKeyStr: string): TimetableDayType {
  const dow = new Date(`${dayKeyStr}T00:00:00.000Z`).getUTCDay();
  return dow === 0 || dow === 6 ? "WEEKEND" : "OFFICE";
}

async function insertScheduled(
  userId: string,
  kind: string,
  fireAt: Date,
  dedupeKey: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await db.from("scheduled_notifications").insert({
    user_id: userId,
    kind,
    fire_at: fireAt.toISOString(),
    dedupe_key: dedupeKey,
    payload,
  });
  // 23505 = unique violation → already materialized. Anything else is real.
  if (error && error.code !== "23505") throw new Error(error.message);
}

/** Phase A: create today's rows for one user (idempotent). */
export async function materializeForUser(user: UserWithSettings, now = new Date()): Promise<void> {
  const tz = tzOf(user.settings);
  const today = dayKey(now, tz);

  const resetTime = user.settings?.reset_time ?? "00:00";
  const eveningTime = user.settings?.evening_reminder_time ?? "23:00";

  await insertScheduled(
    user.id,
    "DAILY_RESET",
    localTimeToUtcInstant(today, resetTime, tz),
    `DAILY_RESET:${today}`,
  );
  await insertScheduled(
    user.id,
    "EVENING_REMINDER",
    localTimeToUtcInstant(today, eveningTime, tz),
    `EVENING_REMINDER:${today}`,
  );

  // Web-delivered timetable pre-reminders (Android schedules these natively).
  if (user.settings?.timetable_alarms_enabled === false) return;
  const isWeekend = dayTypeFor(today) === "WEEKEND";
  if (isWeekend && user.settings?.weekend_alarms === false) return;

  const { data: blocks, error } = await db
    .from("timetable_blocks")
    .select("*")
    .eq("user_id", user.id)
    .in("day_type", ["ALL", dayTypeFor(today)]);
  if (error) throw new Error(error.message);

  const lead = user.settings?.pre_reminder_minutes ?? 5;
  for (const b of (blocks ?? []) as TimetableBlockRow[]) {
    const hh = String(b.start_hour).padStart(2, "0");
    const mm = String(b.start_min).padStart(2, "0");
    const fireAt = new Date(
      localTimeToUtcInstant(today, `${hh}:${mm}`, tz).getTime() - lead * 60_000,
    );
    if (fireAt.getTime() < now.getTime() - 60_000) continue; // already in the past
    await insertScheduled(user.id, "BLOCK_PRE_REMINDER", fireAt, `BLOCK_PRE:${b.id}:${today}`, {
      blockId: b.id,
      activity: b.activity,
      category: b.category,
      startTime: `${hh}:${mm}`,
      leadMinutes: lead,
    });
  }
}

async function markStatus(id: string, status: "SENT" | "FAILED", error?: string): Promise<void> {
  const { error: updErr } = await db
    .from("scheduled_notifications")
    .update({ status, sent_at: new Date().toISOString(), error: error ?? null })
    .eq("id", id);
  if (updErr) console.error("scheduler: failed to mark row", id, updErr.message);
}

async function dispatchRow(row: ScheduledNotificationRow): Promise<void> {
  const today = row.dedupe_key.slice(row.dedupe_key.lastIndexOf(":") + 1);

  if (row.kind === "DAILY_RESET") {
    await runDailyResetForUser(row.user_id, { scheduledId: row.id, dayKeyStr: today });
    return;
  }

  if (row.kind === "EVENING_REMINDER") {
    const { count, error } = await db
      .from("quests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", row.user_id)
      .eq("assigned_date", `${today}T00:00:00.000Z`)
      .eq("status", "ACTIVE");
    if (error) throw new Error(error.message);
    const remaining = count ?? 0;
    const tpl = remaining > 0 ? TEMPLATES.EVENING_REMINDER_REMAINING : TEMPLATES.EVENING_REMINDER_DONE;
    await notifyAndPush(
      row.user_id,
      "EVENING_REMINDER",
      tpl.title,
      fill(tpl.body, { count: remaining }),
      { remaining },
      {
        dedupeKey: `EVENING_REMINDER:${today}`,
        deeplink: tpl.deeplink,
        actions: tpl.actions,
        scheduledId: row.id,
        tag: "evening-reminder",
      },
    );
    return;
  }

  if (row.kind === "BLOCK_PRE_REMINDER") {
    const p = row.payload as { blockId?: string; activity?: string; category?: string; startTime?: string; leadMinutes?: number };
    const tpl = TEMPLATES.BLOCK_PRE_REMINDER;
    const vars = {
      emoji: categoryEmoji(p.category ?? ""),
      activity: p.activity ?? "Next block",
      minutes: p.leadMinutes ?? 5,
      time: p.startTime ?? "",
    };
    await notifyAndPush(
      row.user_id,
      "BLOCK_REMINDER",
      fill(tpl.title, vars),
      fill(tpl.body, vars),
      { blockId: p.blockId },
      {
        dedupeKey: row.dedupe_key,
        deeplink: tpl.deeplink,
        actions: tpl.actions,
        scheduledId: row.id,
        tag: `block-pre-${p.blockId}`,
      },
    );
    return;
  }

  // BLOCK_ALARM / CUSTOM: payload-driven generic dispatch.
  const p = row.payload as { title?: string; body?: string; deeplink?: string };
  await notifyAndPush(row.user_id, "SYSTEM", p.title ?? "Arise//OS", p.body ?? "", row.payload, {
    dedupeKey: row.dedupe_key,
    deeplink: p.deeplink,
    scheduledId: row.id,
  });
}

/** Phase B: deliver everything due. */
export async function dispatchDue(now = new Date()): Promise<{ dispatched: number; failed: number }> {
  const { data, error } = await db
    .from("scheduled_notifications")
    .select("*")
    .eq("status", "PENDING")
    .lte("fire_at", now.toISOString())
    .order("fire_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);

  let dispatched = 0;
  let failed = 0;
  for (const row of (data ?? []) as ScheduledNotificationRow[]) {
    try {
      await dispatchRow(row);
      await markStatus(row.id, "SENT");
      dispatched += 1;
    } catch (e) {
      failed += 1;
      console.error(`scheduler: dispatch failed for ${row.id} (${row.kind})`, e);
      await markStatus(row.id, "FAILED", (e as Error).message);
    }
  }
  return { dispatched, failed };
}

/** One full tick: materialize for every user, then dispatch due rows. */
export async function schedulerTick(now = new Date()): Promise<{ dispatched: number; failed: number }> {
  const users = await allUsers();
  for (const u of users) {
    try {
      await materializeForUser(u, now);
    } catch (e) {
      console.error(`scheduler: materialize failed for user ${u.id}`, e);
    }
  }
  return dispatchDue(now);
}

/** Supersede pending block reminders after a timetable edit. */
export async function supersedeBlockNotifications(userId: string): Promise<void> {
  const { error } = await db
    .from("scheduled_notifications")
    .update({ status: "SUPERSEDED" })
    .eq("user_id", userId)
    .eq("status", "PENDING")
    .in("kind", ["BLOCK_PRE_REMINDER", "BLOCK_ALARM"]);
  if (error) throw new Error(error.message);
}
