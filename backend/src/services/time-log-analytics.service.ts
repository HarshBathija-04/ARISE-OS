/**
 * Time Log analytics — planned (timetable) vs actual (time_logs) rollups.
 *
 * Per day:  plannedMin, actualMin, focusMin, deepWorkMin, per-category hours,
 *           missedMin (planned but neither completed nor covered by a log),
 *           recoveredMin (skipped/missed plan time covered by productive logs),
 *           productivityScore (log-weighted average), timeUtilization.
 * Ranges:   the same rollup summed over N days for weekly/monthly comparison.
 */
import { db } from "../db/supabase.js";
import { addDays, dayKey, gameDay } from "../engine/date.js";
import type {
  TimeLogAiAnalysisRow,
  TimeLogRow,
  TimetableBlockRow,
  TimetableState,
} from "../db/tables.js";
import { logDurationMinutes, overlapMinutes } from "./time-log.service.js";

const COMPLETED_STATES: TimetableState[] = ["COMPLETED", "FINISHED_EARLY"];

export interface DayAnalytics {
  date: string; // YYYY-MM-DD
  plannedMin: number;
  actualMin: number;
  focusMin: number;
  deepWorkMin: number;
  codingMin: number;
  studyMin: number;
  exerciseMin: number;
  entertainmentMin: number;
  missedMin: number;
  recoveredMin: number;
  productivityScore: number; // 0–100 log-weighted
  timeUtilization: number; // 0–100, actual productive vs planned
  xpFromLogs: number;
  logCount: number;
}

type LogWithAnalysis = TimeLogRow & {
  analysis: TimeLogAiAnalysisRow | TimeLogAiAnalysisRow[] | null;
};

function analysisOf(row: LogWithAnalysis): TimeLogAiAnalysisRow | null {
  return (Array.isArray(row.analysis) ? row.analysis[0] : row.analysis) ?? null;
}

function blockShape(b: TimetableBlockRow) {
  return { startHour: b.start_hour, startMin: b.start_min, endHour: b.end_hour, endMin: b.end_min };
}

function logShape(l: TimeLogRow) {
  return { startHour: l.start_hour, startMin: l.start_min, endHour: l.end_hour, endMin: l.end_min };
}

async function analyzeDay(
  userId: string,
  day: Date,
  blocks: TimetableBlockRow[],
): Promise<DayAnalytics> {
  const dayIso = day.toISOString();

  const [{ data: logRows, error: lErr }, { data: stateRows, error: sErr }] = await Promise.all([
    db.from("time_logs").select("*, analysis:time_log_ai_analysis(*)").eq("user_id", userId).eq("date", dayIso),
    db.from("timetable_block_logs").select("block_id, state").eq("user_id", userId).eq("date", dayIso),
  ]);
  if (lErr) throw new Error(lErr.message);
  if (sErr) throw new Error(sErr.message);

  const logs = (logRows ?? []) as LogWithAnalysis[];
  const states = new Map((stateRows ?? []).map((r) => [r.block_id as string, r.state as TimetableState]));

  const out: DayAnalytics = {
    date: dayKey(day, "UTC"),
    plannedMin: 0,
    actualMin: 0,
    focusMin: 0,
    deepWorkMin: 0,
    codingMin: 0,
    studyMin: 0,
    exerciseMin: 0,
    entertainmentMin: 0,
    missedMin: 0,
    recoveredMin: 0,
    productivityScore: 0,
    timeUtilization: 0,
    xpFromLogs: 0,
    logCount: logs.length,
  };

  // ── Actual side: from time logs ──
  let prodWeighted = 0;
  let prodWeight = 0;
  for (const log of logs) {
    const minutes = logDurationMinutes(logShape(log));
    const a = analysisOf(log);
    out.actualMin += minutes;
    out.xpFromLogs += log.xp_awarded;
    if (a) {
      prodWeighted += a.productivity_score * minutes;
      prodWeight += minutes;
      if (a.focus_score >= 60 && a.is_productive) out.focusMin += minutes;
      if (a.is_deep_work) out.deepWorkMin += minutes;
    }
    switch (log.category) {
      case "CODING":
      case "AIML":
        out.codingMin += minutes;
        break;
      case "STUDY":
      case "READING":
        out.studyMin += minutes;
        break;
      case "FITNESS":
        out.exerciseMin += minutes;
        break;
      case "ENTERTAINMENT":
        out.entertainmentMin += minutes;
        break;
    }
  }
  out.productivityScore = prodWeight > 0 ? Math.round(prodWeighted / prodWeight) : 0;

  // ── Planned side: blocks vs completion states vs covering logs ──
  const productiveLogs = logs.filter((l) => analysisOf(l)?.is_productive);
  for (const b of blocks) {
    if (b.category === "SLEEP") continue;
    const len = logDurationMinutes(blockShape(b));
    out.plannedMin += len;
    const state = states.get(b.id) ?? "UPCOMING";
    if (COMPLETED_STATES.includes(state) || state === "EXCUSED") continue;

    // Not completed — was the period covered by a productive log?
    const covered = productiveLogs.reduce(
      (sum, l) => sum + overlapMinutes(blockShape(b), logShape(l)),
      0,
    );
    const coveredCapped = Math.min(len, covered);
    if (state === "SKIPPED" || state === "MISSED") {
      out.recoveredMin += coveredCapped;
      out.missedMin += len - coveredCapped;
    } else if (coveredCapped < len * 0.5) {
      // Untouched block with no meaningful coverage → missed time.
      out.missedMin += len - coveredCapped;
    } else {
      out.recoveredMin += coveredCapped;
    }
  }
  const productiveActual = out.actualMin - out.entertainmentMin;
  out.timeUtilization =
    out.plannedMin > 0
      ? Math.min(100, Math.round(((out.plannedMin - out.missedMin) / out.plannedMin) * 100))
      : productiveActual > 0
        ? 100
        : 0;
  return out;
}

export interface TimeLogAnalytics {
  days: DayAnalytics[];
  totals: Omit<DayAnalytics, "date">;
  /** Rollup for the 7 days before the range — the "weekly comparison". */
  previousWeek: Pick<DayAnalytics, "actualMin" | "focusMin" | "productivityScore" | "xpFromLogs">;
  /** Rollup for the 30 days before today — the "monthly comparison". */
  previousMonth: Pick<DayAnalytics, "actualMin" | "focusMin" | "productivityScore" | "xpFromLogs">;
}

function sumDays(days: DayAnalytics[]): Omit<DayAnalytics, "date"> {
  const t = {
    plannedMin: 0, actualMin: 0, focusMin: 0, deepWorkMin: 0, codingMin: 0,
    studyMin: 0, exerciseMin: 0, entertainmentMin: 0, missedMin: 0,
    recoveredMin: 0, productivityScore: 0, timeUtilization: 0, xpFromLogs: 0, logCount: 0,
  };
  let prodWeighted = 0;
  let utilWeighted = 0;
  for (const d of days) {
    t.plannedMin += d.plannedMin;
    t.actualMin += d.actualMin;
    t.focusMin += d.focusMin;
    t.deepWorkMin += d.deepWorkMin;
    t.codingMin += d.codingMin;
    t.studyMin += d.studyMin;
    t.exerciseMin += d.exerciseMin;
    t.entertainmentMin += d.entertainmentMin;
    t.missedMin += d.missedMin;
    t.recoveredMin += d.recoveredMin;
    t.xpFromLogs += d.xpFromLogs;
    t.logCount += d.logCount;
    prodWeighted += d.productivityScore * d.actualMin;
    utilWeighted += d.timeUtilization * d.plannedMin;
  }
  t.productivityScore = t.actualMin > 0 ? Math.round(prodWeighted / t.actualMin) : 0;
  t.timeUtilization = t.plannedMin > 0 ? Math.round(utilWeighted / t.plannedMin) : 0;
  return t;
}

export async function getTimeLogAnalytics(
  userId: string,
  opts: { date?: string; days?: number } = {},
): Promise<TimeLogAnalytics> {
  const days = opts.days ?? 7;
  const end = opts.date ? new Date(`${opts.date}T00:00:00.000Z`) : gameDay();

  // Blocks change rarely — fetch once for all days.
  const { data: blockRows, error: bErr } = await db
    .from("timetable_blocks")
    .select("*")
    .eq("user_id", userId);
  if (bErr) throw new Error(bErr.message);
  const blocks = (blockRows ?? []) as TimetableBlockRow[];

  const dayResults: DayAnalytics[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dayResults.push(await analyzeDay(userId, addDays(end, -i), blocks));
  }

  const prevWeekDays: DayAnalytics[] = [];
  for (let i = days + 6; i >= days; i--) {
    prevWeekDays.push(await analyzeDay(userId, addDays(end, -i), blocks));
  }
  const prevWeek = sumDays(prevWeekDays);

  // Monthly comparison from activity_logs (cheap aggregate; per-day analyze
  // over 30 more days would be 60+ queries).
  const monthStart = addDays(end, -37).toISOString();
  const monthEnd = addDays(end, -7).toISOString();
  const { data: monthActs, error: mErr } = await db
    .from("activity_logs")
    .select("kind, value")
    .eq("user_id", userId)
    .eq("kind", "time_log")
    .gte("date", monthStart)
    .lt("date", monthEnd);
  if (mErr) throw new Error(mErr.message);
  const monthActual = (monthActs ?? []).reduce((s, a) => s + ((a.value as number) ?? 0), 0);

  return {
    days: dayResults,
    totals: sumDays(dayResults),
    previousWeek: {
      actualMin: prevWeek.actualMin,
      focusMin: prevWeek.focusMin,
      productivityScore: prevWeek.productivityScore,
      xpFromLogs: prevWeek.xpFromLogs,
    },
    previousMonth: {
      actualMin: monthActual,
      focusMin: 0,
      productivityScore: 0,
      xpFromLogs: 0,
    },
  };
}
