import { Router } from "express";
import { z } from "zod";
import { db } from "../db/supabase.js";
import {
  logHabit,
  logUrge,
  completeRecoveryQuest,
} from "../services/habit.service.js";
import { getShadowHabitStatus, getOpenRecoveryQuest } from "../services/views.service.js";

export const habitsRoutes = Router();

habitsRoutes.get("/habits", async (req, res, next) => {
  try {
    const [{ data, error }, shadow] = await Promise.all([
      db
        .from("habits")
        .select("*, logs:habit_logs(*)")
        .eq("user_id", req.userId)
        .eq("active", true)
        .order("created_at", { ascending: true }),
      getShadowHabitStatus(req.userId),
    ]);
    if (error) throw new Error(error.message);
    res.json({ ok: true, habits: data, shadow });
  } catch (e) {
    next(e);
  }
});

habitsRoutes.post("/habits/log", async (req, res, next) => {
  try {
    const input = z
      .object({
        habitKey: z.string().min(1),
        result: z.enum(["DONE", "MISSED", "CLEAN", "RELAPSE"]),
        note: z.string().max(500).optional(),
      })
      .parse(req.body);
    const result = await logHabit({ userId: req.userId, ...input });
    res.json({ ...result, ok: true });
  } catch (e) {
    next(e);
  }
});

habitsRoutes.get("/urges", async (req, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit ?? 20));
    const { data, error } = await db
      .from("urge_logs")
      .select("*")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    res.json({ ok: true, urges: data });
  } catch (e) {
    next(e);
  }
});

habitsRoutes.post("/urges", async (req, res, next) => {
  try {
    const input = z
      .object({
        habitKey: z.string().min(1),
        resisted: z.boolean(),
        trigger: z.string().max(200).optional(),
        mood: z.string().max(100).optional(),
        location: z.string().max(100).optional(),
        reason: z.string().max(500).optional(),
      })
      .parse(req.body);
    const result = await logUrge({ userId: req.userId, ...input });
    res.json({ ...result, ok: true });
  } catch (e) {
    next(e);
  }
});

habitsRoutes.get("/recovery/open", async (req, res, next) => {
  try {
    res.json({ ok: true, recovery: await getOpenRecoveryQuest(req.userId) });
  } catch (e) {
    next(e);
  }
});

habitsRoutes.get("/recovery/history", async (req, res, next) => {
  try {
    const { data, error } = await db
      .from("recovery_quests")
      .select("*")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    res.json({ ok: true, history: data });
  } catch (e) {
    next(e);
  }
});

habitsRoutes.post("/recovery/:id/complete", async (req, res, next) => {
  try {
    const result = await completeRecoveryQuest(req.userId, req.params.id);
    res.json({ ...result, ok: true });
  } catch (e) {
    next(e);
  }
});
