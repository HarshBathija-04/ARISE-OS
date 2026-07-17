/**
 * Alarm plan + action endpoints. `/plan` is the single payload Android
 * schedules everything from natively; confirm/skip/snooze are called by the
 * full-screen alarm UI (and web notification actions) and are idempotent per
 * (blockId, date). `/events` is the batch ingest for the device's offline
 * event queue.
 */
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/supabase.js";
import { gameDay, dayKey } from "../engine/date.js";
import { AppError } from "../middleware/error.js";
import type {
  AlarmEventType,
  FocusCategory,
  TimetableBlockRow,
  TimetableState,
  UserSettingsRow,
} from "../db/tables.js";
import { setBlockState } from "../services/timetable.service.js";
import { startFocusSession } from "../services/focus.service.js";

export const alarmsRoutes = Router();

async function getSettings(userId: string): Promise<UserSettingsRow | null> {
  const { data, error } = await db
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as UserSettingsRow | null;
}

async function getTimetableVersion(userId: string): Promise<number> {
  const { data, error } = await db
    .from("users")
    .select("timetable_version")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.timetable_version as number) ?? 1;
}

// ── GET /v1/alarms/plan — everything a device needs to schedule natively ──
alarmsRoutes.get("/plan", async (req, res, next) => {
  try {
    const [settings, version, blocksRes] = await Promise.all([
      getSettings(req.userId),
      getTimetableVersion(req.userId),
      db.from("timetable_blocks").select("*").eq("user_id", req.userId).order("order"),
    ]);
    if (blocksRes.error) throw new Error(blocksRes.error.message);
    const blocks = (blocksRes.data as TimetableBlockRow[]).map((b) => ({
      id: b.id,
      activity: b.activity,
      category: b.category,
      startHour: b.start_hour,
      startMin: b.start_min,
      endHour: b.end_hour,
      endMin: b.end_min,
      dayType: b.day_type,
      xpReward: b.xp_reward,
    }));
    res.json({
      ok: true,
      version,
      timezone: settings?.timezone ?? "Asia/Kolkata",
      settings: {
        timetableAlarmsEnabled: settings?.timetable_alarms_enabled ?? true,
        preReminderMinutes: settings?.pre_reminder_minutes ?? 5,
        alarmRepeatCount: settings?.alarm_repeat_count ?? 3,
        alarmRepeatGapSec: settings?.alarm_repeat_gap_sec ?? 120,
        autoStartFocus: settings?.auto_start_focus ?? true,
        weekendAlarms: settings?.weekend_alarms ?? true,
        dndStart: settings?.dnd_start ?? null,
        dndEnd: settings?.dnd_end ?? null,
        alarmConfig: settings?.alarm_config ?? {
          sound: "arise_default",
          volume: 0.8,
          vibration: true,
          snoozeOptions: [5, 10, 15],
          defaultSnooze: 5,
        },
      },
      blocks,
    });
  } catch (e) {
    next(e);
  }
});

// ── POST /v1/alarms/events — batch analytics ingest (offline queue flush) ──
const eventSchema = z.object({
  blockId: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event: z.enum([
    "SCHEDULED",
    "FIRED",
    "DELIVERED",
    "CONFIRMED",
    "SKIPPED",
    "SNOOZED",
    "MISSED",
    "CANCELLED",
    "ERROR",
  ]),
  attempt: z.number().int().min(1).max(20).optional(),
  snoozeMinutes: z.number().int().min(1).max(120).optional(),
  skipReason: z.string().max(500).optional(),
  responseMs: z.number().int().min(0).optional(),
  deviceId: z.string().max(128).optional(),
  meta: z.record(z.unknown()).optional(),
});

async function insertAlarmEvent(
  userId: string,
  e: z.infer<typeof eventSchema>,
): Promise<void> {
  const { error } = await db.from("alarm_events").insert({
    user_id: userId,
    block_id: e.blockId ?? null,
    date: e.date,
    event: e.event as AlarmEventType,
    attempt: e.attempt ?? 1,
    snooze_minutes: e.snoozeMinutes ?? null,
    skip_reason: e.skipReason ?? null,
    response_ms: e.responseMs ?? null,
    device_id: e.deviceId ?? "",
    meta: e.meta ?? {},
  });
  if (error) {
    // Block may have been deleted since the event was queued — keep the
    // event with a null block rather than dropping analytics.
    if (error.code === "23503" && e.blockId) {
      await insertAlarmEvent(userId, { ...e, blockId: null, meta: { ...e.meta, orphanedBlockId: e.blockId } });
      return;
    }
    throw new Error(error.message);
  }
}

alarmsRoutes.post("/events", async (req, res, next) => {
  try {
    const { events } = z.object({ events: z.array(eventSchema).max(200) }).parse(req.body);
    for (const e of events) await insertAlarmEvent(req.userId, e);
    res.json({ ok: true, ingested: events.length });
  } catch (e) {
    next(e);
  }
});

// ── Alarm actions (idempotent per blockId+date) ──

const actionBase = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  responseMs: z.number().int().min(0).optional(),
  deviceId: z.string().max(128).optional(),
});

async function currentBlockState(
  userId: string,
  blockId: string,
  date: string,
): Promise<TimetableState | null> {
  const { data, error } = await db
    .from("timetable_block_logs")
    .select("state")
    .eq("user_id", userId)
    .eq("block_id", blockId)
    .eq("date", `${date}T00:00:00.000Z`)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.state as TimetableState) ?? null;
}

async function findBlockOwned(userId: string, blockId: string): Promise<TimetableBlockRow> {
  const { data, error } = await db
    .from("timetable_blocks")
    .select("*")
    .eq("id", blockId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new AppError("Block not found", 404);
  return data as TimetableBlockRow;
}

/** Map a timetable category to the focus category used for auto-start. */
function focusCategoryFor(block: TimetableBlockRow): FocusCategory | null {
  if (block.category !== "STUDY" && block.category !== "WORK") return null;
  return "GATE"; // default focus track; user can retag in the focus screen
}

function blockDurationMinutes(block: TimetableBlockRow): number {
  const start = block.start_hour * 60 + block.start_min;
  const end = block.end_hour * 60 + block.end_min;
  const dur = end - start;
  return Math.min(240, Math.max(5, dur > 0 ? dur : 60));
}

// Confirm: stop-alarm acknowledged → block ACTIVE + (optionally) auto-start focus.
alarmsRoutes.post("/:blockId/confirm", async (req, res, next) => {
  try {
    const input = actionBase.parse(req.body);
    const date = input.date ?? dayKey(gameDay());
    const block = await findBlockOwned(req.userId, req.params.blockId);

    const prev = await currentBlockState(req.userId, block.id, date);
    const terminal: TimetableState[] = ["COMPLETED", "FINISHED_EARLY", "SKIPPED", "EXCUSED"];
    if (prev && terminal.includes(prev)) {
      // Already resolved (double-tap / replayed queue) — no-op.
      return res.json({ ok: true, alreadyResolved: true, state: prev });
    }

    await insertAlarmEvent(req.userId, {
      blockId: block.id,
      date,
      event: "CONFIRMED",
      responseMs: input.responseMs,
      deviceId: input.deviceId,
    });
    if (prev !== "ACTIVE") await setBlockState(req.userId, block.id, "ACTIVE");

    // Auto-start a focus session for study/work blocks when enabled.
    const settings = await getSettings(req.userId);
    const focusCategory = focusCategoryFor(block);
    let focusSessionId: string | null = null;
    let plannedMinutes: number | null = null;
    if ((settings?.auto_start_focus ?? true) && focusCategory) {
      // Don't stack sessions: reuse an un-ended one from today if present.
      const { data: open, error: openErr } = await db
        .from("focus_sessions")
        .select("id, planned_min")
        .eq("user_id", req.userId)
        .is("ended_at", null)
        .gte("started_at", gameDay().toISOString())
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (openErr) throw new Error(openErr.message);
      if (open) {
        focusSessionId = open.id as string;
        plannedMinutes = open.planned_min as number;
      } else {
        plannedMinutes = blockDurationMinutes(block);
        const session = await startFocusSession({
          userId: req.userId,
          category: focusCategory,
          plannedMinutes,
        });
        focusSessionId = session.id as string;
      }
    }

    res.json({ ok: true, focusSessionId, focusCategory, plannedMinutes });
  } catch (e) {
    next(e);
  }
});

// Skip: record the reason, mark the block SKIPPED.
alarmsRoutes.post("/:blockId/skip", async (req, res, next) => {
  try {
    const input = actionBase
      .extend({ reason: z.string().min(1).max(500) })
      .parse(req.body);
    const date = input.date ?? dayKey(gameDay());
    const block = await findBlockOwned(req.userId, req.params.blockId);

    const prev = await currentBlockState(req.userId, block.id, date);
    const terminal: TimetableState[] = ["COMPLETED", "FINISHED_EARLY", "SKIPPED", "EXCUSED"];
    if (prev && terminal.includes(prev)) {
      return res.json({ ok: true, alreadyResolved: true, state: prev });
    }

    await insertAlarmEvent(req.userId, {
      blockId: block.id,
      date,
      event: "SKIPPED",
      skipReason: input.reason,
      responseMs: input.responseMs,
      deviceId: input.deviceId,
    });
    // "Already completed" is self-reported completion, not a skip.
    const state: TimetableState = input.reason === "Already completed" ? "COMPLETED" : "SKIPPED";
    await setBlockState(req.userId, block.id, state);
    res.json({ ok: true, state });
  } catch (e) {
    next(e);
  }
});

// Snooze: analytics only — the reschedule itself happens natively on-device.
alarmsRoutes.post("/:blockId/snooze", async (req, res, next) => {
  try {
    const input = actionBase
      .extend({ minutes: z.number().int().min(1).max(120) })
      .parse(req.body);
    const date = input.date ?? dayKey(gameDay());
    const block = await findBlockOwned(req.userId, req.params.blockId);
    await insertAlarmEvent(req.userId, {
      blockId: block.id,
      date,
      event: "SNOOZED",
      snoozeMinutes: input.minutes,
      responseMs: input.responseMs,
      deviceId: input.deviceId,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
