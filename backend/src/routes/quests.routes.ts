import { Router } from "express";
import { z } from "zod";
import { db } from "../db/supabase.js";
import { completeQuest, ensureTodayQuests, logMainQuestProgress } from "../services/quest.service.js";
import { getTodayQuests } from "../services/views.service.js";

export const questsRoutes = Router();

questsRoutes.get("/quests/today", async (req, res, next) => {
  try {
    // Lazily ensure the day's quests exist (idempotent) — same behavior as
    // the old dashboard load, and a safety net if the cron missed a tick.
    await ensureTodayQuests(req.userId);
    res.json({ ok: true, quests: await getTodayQuests(req.userId) });
  } catch (e) {
    next(e);
  }
});

questsRoutes.post("/quests/generate", async (req, res, next) => {
  try {
    const { regenerate } = z
      .object({ regenerate: z.boolean().optional() })
      .parse(req.body ?? {});
    const result = await ensureTodayQuests(req.userId, regenerate ?? false);
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});

const questResult = z.enum(["COMPLETED", "PARTIAL", "FAILED"]);

questsRoutes.post("/quests/:id/complete", async (req, res, next) => {
  try {
    const { result } = z.object({ result: questResult }).parse(req.body);
    const award = await completeQuest(req.userId, req.params.id, result);
    res.json({ ok: true, award });
  } catch (e) {
    next(e);
  }
});

questsRoutes.get("/main-quests", async (req, res, next) => {
  try {
    const { data, error } = await db
      .from("main_quests")
      .select("*, stages:main_quest_stages(*)")
      .eq("user_id", req.userId)
      .eq("active", true)
      .order("order", { ascending: true });
    if (error) throw new Error(error.message);
    res.json({ ok: true, mainQuests: data });
  } catch (e) {
    next(e);
  }
});

questsRoutes.post("/main-quests/stages/:id/progress", async (req, res, next) => {
  try {
    const { amount } = z.object({ amount: z.number().int().min(1).max(50) }).parse(req.body);
    const result = await logMainQuestProgress(req.userId, req.params.id, amount);
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});
