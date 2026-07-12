/**
 * THE GUIDE — data-driven insight engine.
 * Produces SPECIFIC, numeric observations (never generic motivation),
 * derived from the player's own logs. Works with zero AI credentials.
 */
import { getDailyMetrics, getPerformance } from "@/lib/player-data";
import { prisma } from "@/lib/prisma";
import { weekKey } from "@/lib/date";

export interface Insight {
  kind: "observation" | "warning" | "win" | "recommendation";
  text: string;
}

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
function pctChange(a: number, b: number) {
  if (b === 0) return a === 0 ? 0 : 100;
  return Math.round(((a - b) / b) * 100);
}

export async function buildInsights(userId: string): Promise<{
  insights: Insight[];
  weekly: WeeklyReport;
}> {
  const metrics = await getDailyMetrics(userId, 30);
  const perf = await getPerformance(userId);
  const sorted = [...metrics].sort((a, b) => (a.dayKey < b.dayKey ? -1 : 1));
  const last7 = sorted.slice(-7);
  const prev7 = sorted.slice(-14, -7);

  const insights: Insight[] = [];

  // Study trend
  const study7 = avg(last7.map((m) => m.studyMinutes));
  const studyPrev = avg(prev7.map((m) => m.studyMinutes));
  if (last7.length >= 3) {
    const change = pctChange(study7, studyPrev);
    if (change <= -20) {
      insights.push({ kind: "warning", text: `Study time is down ${Math.abs(change)}% vs the previous week (${Math.round(study7)}m/day avg). Protect your 09:00–11:00 block first.` });
    } else if (change >= 20) {
      insights.push({ kind: "win", text: `Study time is up ${change}% week-over-week to ${Math.round(study7)}m/day. This is the compounding you want.` });
    }
  }

  // Distraction vs focus correlation
  const distraction7 = avg(last7.map((m) => m.distractionMinutes));
  if (distraction7 > 45) {
    const focus7 = avg(last7.map((m) => m.focusMinutes));
    insights.push({ kind: "warning", text: `You averaged ${Math.round(distraction7)}m/day of distraction while focus sat at ${Math.round(focus7)}m/day. Every hour of reels is roughly one deep-work block you didn't take.` });
  }

  // Workout consistency
  const workoutDays = last7.filter((m) => m.workout).length;
  if (last7.length >= 5) {
    if (workoutDays <= 1) {
      insights.push({ kind: "recommendation", text: `Only ${workoutDays} workout in the last 7 days. Tomorrow's plan will lead with a short 20-minute physical quest to rebuild the pattern.` });
    } else if (workoutDays >= 5) {
      insights.push({ kind: "win", text: `${workoutDays}/7 workout days — Physical Ascension is on track.` });
    }
  }

  // Sleep vs wake
  const sleep7 = avg(last7.map((m) => m.sleepHours));
  const wokeDays = last7.filter((m) => m.wokeOnTime).length;
  if (last7.length >= 4 && sleep7 < 6) {
    insights.push({ kind: "warning", text: `Average sleep is ${sleep7.toFixed(1)}h — below your 6h floor. Under-sleep is the hidden tax on every other stat. Pull your power-down 30 minutes earlier.` });
  }
  if (last7.length >= 4 && wokeDays <= 2) {
    insights.push({ kind: "observation", text: `You hit your 05:00 wake ${wokeDays}/7 days. The morning study block depends on this — it's the single highest-leverage habit right now.` });
  }

  // Clean-day / recovery pattern
  const cleanDays = last7.filter((m) => m.cleanDay).length;
  if (last7.length >= 5 && cleanDays >= 6) {
    insights.push({ kind: "win", text: `${cleanDays}/7 clean days. Your recovery score (${perf.recovery}) reflects real self-control, not luck.` });
  }

  // Weakest sub-score recommendation
  const subs: [string, number][] = [
    ["Discipline", perf.discipline], ["Knowledge", perf.knowledge],
    ["Physical", perf.physical], ["Focus", perf.focus], ["Recovery", perf.recovery],
  ];
  const weakest = subs.reduce((min, s) => (s[1] < min[1] ? s : min), subs[0]!);
  insights.push({ kind: "recommendation", text: `Your weakest dimension is ${weakest[0]} (${weakest[1]}/100). Next week's main objective should target it directly.` });

  if (insights.length === 0) {
    insights.push({ kind: "observation", text: "Not enough data yet. Complete a few days of quests and the Guide will surface specific, numeric patterns — not slogans." });
  }

  const weekly = buildWeeklyReport(userId, metrics, perf, weakest[0]);
  return { insights, weekly: await weekly };
}

export interface WeeklyReport {
  periodKey: string;
  totalStudyHours: number;
  totalFocusHours: number;
  dsaSolved: number;
  workoutDays: number;
  strongest: string;
  weakest: string;
  bestDay: string | null;
  worstDay: string | null;
  lifeScore: number;
  nextObjective: string;
}

async function buildWeeklyReport(
  userId: string,
  metrics: Awaited<ReturnType<typeof getDailyMetrics>>,
  perf: Awaited<ReturnType<typeof getPerformance>>,
  weakest: string,
): Promise<WeeklyReport> {
  const last7 = [...metrics].sort((a, b) => (a.dayKey < b.dayKey ? -1 : 1)).slice(-7);
  const scored = last7.map((m) => ({
    key: m.dayKey,
    score: m.routineCompletionRatio * 100 + m.studyMinutes / 3 + (m.workout ? 30 : 0),
  }));
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a), scored[0] ?? { key: "", score: -1 });
  const worst = scored.reduce((a, b) => (b.score < a.score ? b : a), scored[0] ?? { key: "", score: 1e9 });

  const subs: [string, number][] = [
    ["Discipline", perf.discipline], ["Knowledge", perf.knowledge],
    ["Physical", perf.physical], ["Focus", perf.focus], ["Recovery", perf.recovery],
  ];
  const strongest = subs.reduce((max, s) => (s[1] > max[1] ? s : max), subs[0]!)[0];

  return {
    periodKey: weekKey(),
    totalStudyHours: Math.round(last7.reduce((s, m) => s + m.studyMinutes, 0) / 60),
    totalFocusHours: Math.round(last7.reduce((s, m) => s + m.focusMinutes, 0) / 60),
    dsaSolved: last7.reduce((s, m) => s + m.dsaSolved, 0),
    workoutDays: last7.filter((m) => m.workout).length,
    strongest,
    weakest,
    bestDay: best?.key || null,
    worstDay: worst?.key || null,
    lifeScore: perf.life,
    nextObjective: `Raise ${weakest} by targeting it with your first daily quest each morning.`,
  };
}
