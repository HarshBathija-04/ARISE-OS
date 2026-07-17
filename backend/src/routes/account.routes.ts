import { Router } from "express";
import { db } from "../db/supabase.js";
import { bootstrapAccount } from "../services/account.service.js";
import { signalTimetableChanged } from "../services/timetable.service.js";

export const accountRoutes = Router();

// Called once by clients after first Supabase Auth signup.
// Idempotent — safe to call on every login.
accountRoutes.post("/bootstrap", async (req, res, next) => {
  try {
    const result = await bootstrapAccount(req.userId);
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});

accountRoutes.post("/reset", async (req, res, next) => {
  try {
    const { error } = await db.rpc("reset_profile", { p_user_id: req.userId });
    if (error) throw new Error(error.message);
    await signalTimetableChanged(req.userId);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
