/**
 * Time Log routes — /v1/time-logs
 *
 * POST   /            create + AI-classify + award XP
 * GET    /            list (optionally ?date=YYYY-MM-DD)
 * PATCH  /:id         edit
 * DELETE /:id         delete
 * POST   /analyze     classify + XP preview without saving
 * POST   /award-xp    (re-)award XP for a log ({id})
 * GET    /analytics   planned-vs-actual rollup (?date=, ?days=)
 */
import { Router } from "express";
import { z } from "zod";
import {
  analyzeTimeLog,
  awardXpForLog,
  createTimeLog,
  deleteTimeLog,
  listTimeLogs,
  updateTimeLog,
} from "../services/time-log.service.js";
import { getTimeLogAnalytics } from "../services/time-log-analytics.service.js";
import { validateDayEvidence } from "../services/streak-validation.service.js";

export const timeLogsRoutes = Router();

const category = z.enum([
  "STUDY",
  "CODING",
  "AIML",
  "READING",
  "WRITING",
  "FITNESS",
  "HEALTH",
  "FINANCE",
  "BUSINESS",
  "PERSONAL",
  "ENTERTAINMENT",
  "SOCIAL",
  "REST",
]);

const logInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startHour: z.number().int().min(0).max(23),
  startMin: z.number().int().min(0).max(59),
  endHour: z.number().int().min(0).max(23),
  endMin: z.number().int().min(0).max(59),
  activity: z.string().min(1).max(160),
  category: category.optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  mood: z.string().max(40).optional(),
  energyLevel: z.number().int().min(1).max(10).optional(),
  location: z.string().max(160).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  blockId: z.string().min(1).optional(),
});

timeLogsRoutes.post("/", async (req, res, next) => {
  try {
    const input = logInput.parse(req.body);
    const result = await createTimeLog(req.userId, input);
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});

timeLogsRoutes.get("/", async (req, res, next) => {
  try {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().parse(req.query.date);
    res.json({ ok: true, logs: await listTimeLogs(req.userId, date) });
  } catch (e) {
    next(e);
  }
});

// Analyze without saving — the XP preview while typing.
timeLogsRoutes.post("/analyze", async (req, res, next) => {
  try {
    const input = logInput.omit({ tags: true }).parse(req.body);
    const result = await analyzeTimeLog(req.userId, input);
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});

// Explicit XP awarding (idempotent) — accepts {id} in the body per the spec.
timeLogsRoutes.post("/award-xp", async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.body);
    const result = await awardXpForLog(req.userId, id);
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});

// Planned vs actual analytics (?date=YYYY-MM-DD for one day, ?days=N range).
timeLogsRoutes.get("/analytics", async (req, res, next) => {
  try {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().parse(req.query.date);
    const days = Math.min(90, Math.max(1, Number(req.query.days ?? 7)));
    res.json({ ok: true, analytics: await getTimeLogAnalytics(req.userId, { date, days }) });
  } catch (e) {
    next(e);
  }
});

// Streak evidence probe — what would the validation engine decide for a day?
timeLogsRoutes.get("/streak-evidence", async (req, res, next) => {
  try {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().parse(req.query.date);
    const day = date ? new Date(`${date}T00:00:00.000Z`) : undefined;
    res.json({ ok: true, evidence: await validateDayEvidence(req.userId, day) });
  } catch (e) {
    next(e);
  }
});

timeLogsRoutes.patch("/:id", async (req, res, next) => {
  try {
    const updates = logInput.partial().parse(req.body);
    const log = await updateTimeLog(req.userId, req.params.id, updates);
    res.json({ ok: true, log });
  } catch (e) {
    next(e);
  }
});

timeLogsRoutes.delete("/:id", async (req, res, next) => {
  try {
    await deleteTimeLog(req.userId, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
