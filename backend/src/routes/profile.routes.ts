import { Router } from "express";
import { z } from "zod";
import { db } from "../db/supabase.js";
import { getProfileView, getAttributes } from "../services/views.service.js";
import { signalTimetableChanged } from "../services/timetable.service.js";

export const profileRoutes = Router();

profileRoutes.get("/profile", async (req, res, next) => {
  try {
    res.json({ ok: true, profile: await getProfileView(req.userId) });
  } catch (e) {
    next(e);
  }
});

profileRoutes.get("/attributes", async (req, res, next) => {
  try {
    res.json({ ok: true, attributes: await getAttributes(req.userId) });
  } catch (e) {
    next(e);
  }
});

profileRoutes.get("/attributes/history", async (req, res, next) => {
  try {
    const limit = Math.min(500, Number(req.query.limit ?? 100));
    const { data, error } = await db
      .from("attribute_history")
      .select("*")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    res.json({ ok: true, history: data });
  } catch (e) {
    next(e);
  }
});

profileRoutes.get("/settings", async (req, res, next) => {
  try {
    const { data, error } = await db
      .from("user_settings")
      .select("*")
      .eq("user_id", req.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    res.json({ ok: true, settings: data });
  } catch (e) {
    next(e);
  }
});

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

const settingsPatch = z.object({
  wakeTarget: hhmm.optional(),
  sleepTarget: hhmm.optional(),
  minSleepHours: z.number().min(0).max(14).optional(),
  difficultyBias: z.number().min(0.5).max(2).optional(),
  reduceMotion: z.boolean().optional(),
  aiProvider: z.string().optional(),
  aiModel: z.string().optional(),
  theme: z.string().optional(),
  timezone: z.string().optional(),
  // Notification & alarm preferences (0007)
  resetTime: hhmm.optional(),
  eveningReminderTime: hhmm.optional(),
  pushEnabled: z.boolean().optional(),
  questPushEnabled: z.boolean().optional(),
  timetableAlarmsEnabled: z.boolean().optional(),
  preReminderMinutes: z.number().int().min(0).max(60).optional(),
  alarmRepeatCount: z.number().int().min(1).max(10).optional(),
  alarmRepeatGapSec: z.number().int().min(30).max(600).optional(),
  autoStartFocus: z.boolean().optional(),
  weekendAlarms: z.boolean().optional(),
  dndStart: hhmm.nullable().optional(),
  dndEnd: hhmm.nullable().optional(),
  alarmConfig: z
    .object({
      sound: z.string().max(60),
      volume: z.number().min(0).max(1),
      vibration: z.boolean(),
      snoozeOptions: z.array(z.number().int().min(1).max(60)).min(1).max(6),
      defaultSnooze: z.number().int().min(1).max(60),
    })
    .optional(),
});

/** Settings that require devices to reschedule their native alarms. */
const ALARM_KEYS = new Set([
  "resetTime",
  "eveningReminderTime",
  "timetableAlarmsEnabled",
  "preReminderMinutes",
  "alarmRepeatCount",
  "alarmRepeatGapSec",
  "autoStartFocus",
  "weekendAlarms",
  "dndStart",
  "dndEnd",
  "alarmConfig",
  "timezone",
]);

profileRoutes.patch("/settings", async (req, res, next) => {
  try {
    const input = settingsPatch.parse(req.body);
    const patch: Record<string, unknown> = {};
    if (input.wakeTarget !== undefined) patch.wake_target = input.wakeTarget;
    if (input.sleepTarget !== undefined) patch.sleep_target = input.sleepTarget;
    if (input.minSleepHours !== undefined) patch.min_sleep_hours = input.minSleepHours;
    if (input.difficultyBias !== undefined) patch.difficulty_bias = input.difficultyBias;
    if (input.reduceMotion !== undefined) patch.reduce_motion = input.reduceMotion;
    if (input.aiProvider !== undefined) patch.ai_provider = input.aiProvider;
    if (input.aiModel !== undefined) patch.ai_model = input.aiModel;
    if (input.theme !== undefined) patch.theme = input.theme;
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.resetTime !== undefined) patch.reset_time = input.resetTime;
    if (input.eveningReminderTime !== undefined) patch.evening_reminder_time = input.eveningReminderTime;
    if (input.pushEnabled !== undefined) patch.push_enabled = input.pushEnabled;
    if (input.questPushEnabled !== undefined) patch.quest_push_enabled = input.questPushEnabled;
    if (input.timetableAlarmsEnabled !== undefined) patch.timetable_alarms_enabled = input.timetableAlarmsEnabled;
    if (input.preReminderMinutes !== undefined) patch.pre_reminder_minutes = input.preReminderMinutes;
    if (input.alarmRepeatCount !== undefined) patch.alarm_repeat_count = input.alarmRepeatCount;
    if (input.alarmRepeatGapSec !== undefined) patch.alarm_repeat_gap_sec = input.alarmRepeatGapSec;
    if (input.autoStartFocus !== undefined) patch.auto_start_focus = input.autoStartFocus;
    if (input.weekendAlarms !== undefined) patch.weekend_alarms = input.weekendAlarms;
    if (input.dndStart !== undefined) patch.dnd_start = input.dndStart;
    if (input.dndEnd !== undefined) patch.dnd_end = input.dndEnd;
    if (input.alarmConfig !== undefined) patch.alarm_config = input.alarmConfig;
    const { error } = await db.from("user_settings").update(patch).eq("user_id", req.userId);
    if (error) throw new Error(error.message);
    // Alarm-relevant change → devices must reschedule.
    if (Object.keys(input).some((k) => ALARM_KEYS.has(k))) {
      await signalTimetableChanged(req.userId);
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
