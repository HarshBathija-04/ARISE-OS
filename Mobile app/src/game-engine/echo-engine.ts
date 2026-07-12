/**
 * SOLO OS — ECHO engine (intelligence layer).
 *
 * ECHO turns REAL store data into three data-driven reports:
 *   • MORNING  — a prioritized directive for the day ahead.
 *   • EVENING  — a factual review of what actually happened today.
 *   • WEEKLY   — a 7-day SYSTEM ANALYSIS REPORT with trend vectors.
 *
 * Everything here is PURE and deterministic — no randomness, no motivation
 * filler. Every number traces back to a mission, focus session, streak, or the
 * Life Performance score. An AI provider may later narrate these facts in
 * ECHO's voice, but the facts themselves are computed here.
 *
 * PRIVACY: sensitive shadow-habit names never enter a report. The SHADOW_CONTROL
 * streak is referenced only by its generic label.
 */
import type {
  PlayerProfile, PerformanceScore, Mission, FocusSession, Streak,
  AttributeState, SystemEvent, AttributeCode,
} from '@/types';
import type {
  EchoReportKind, InsightTone, AINarrationMetric, AINarrationInsight,
  AINarrationRecommendation, AINarrationRequest,
} from '@/services/ai/types';
import { toLocalDateKey, isSameDay } from '@/utils/date';

// ── Report shape ───────────────────────────────────────────────────
export interface EchoReport {
  kind: EchoReportKind;
  /** Local date key the report covers (YYYY-MM-DD). */
  date: string;
  generatedAt: string;
  headline: string;
  status: string;
  metrics: AINarrationMetric[];
  insights: AINarrationInsight[];
  recommendations: AINarrationRecommendation[];
}

export interface EchoSnapshot {
  date: string; // todayIso
  generatedAt: string; // nowIso
  profile: Pick<
    PlayerProfile,
    'displayName' | 'level' | 'rank' | 'lifetimeXp' | 'coins' | 'privacyMode' | 'sleepTargetHours' | 'wakeTarget'
  >;
  performance: PerformanceScore;
  missions: Mission[];
  focusSessions: FocusSession[];
  streaks: Streak[];
  attributes: AttributeState[];
  events: SystemEvent[];
  /** XP earned so far today (from the daily tracker). */
  dailyXp: number;
}

const ATTR_NAME: Record<AttributeCode, string> = {
  STR: 'STRENGTH', INT: 'INTELLIGENCE', FOC: 'FOCUS', DIS: 'DISCIPLINE',
  END: 'ENDURANCE', CON: 'CONSISTENCY', SKL: 'SKILL', VIT: 'VITALITY',
};

const PERF_LABEL: Record<string, string> = {
  discipline: 'DISCIPLINE', knowledge: 'KNOWLEDGE', physical: 'PHYSICAL',
  focus: 'FOCUS', recovery: 'RECOVERY',
};

// ── Small helpers ──────────────────────────────────────────────────
function toneForScore(score: number): InsightTone {
  if (score >= 70) return 'positive';
  if (score >= 50) return 'neutral';
  if (score >= 30) return 'warning';
  return 'critical';
}

function todaysDailies(missions: Mission[], date: string): Mission[] {
  return missions.filter(
    (m) => (m.type === 'DAILY' || m.type === 'RECOVERY') && isSameDay(m.createdAt, date),
  );
}

function focusMinutesOn(sessions: FocusSession[], date: string): number {
  const secs = sessions
    .filter((s) => s.endedAt != null && isSameDay(s.endedAt, date))
    .reduce((sum, s) => sum + s.activeSeconds, 0);
  return Math.round(secs / 60);
}

/** Streaks that are alive but not yet advanced today (breakable if ignored). */
function streaksNeedingAction(streaks: Streak[], date: string): Streak[] {
  return streaks.filter(
    (s) => s.currentStreak > 0 && s.lastSuccessDate !== date,
  );
}

function weakestPerfCategory(perf: PerformanceScore): { key: string; value: number } {
  const entries = Object.entries(perf.categories) as [string, number][];
  entries.sort((a, b) => a[1] - b[1]);
  return { key: entries[0][0], value: entries[0][1] };
}

function strongestPerfCategory(perf: PerformanceScore): { key: string; value: number } {
  const entries = Object.entries(perf.categories) as [string, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return { key: entries[0][0], value: entries[0][1] };
}

// ── MORNING ────────────────────────────────────────────────────────
export function buildMorningReport(snap: EchoSnapshot): EchoReport {
  const dailies = todaysDailies(snap.missions, snap.date);
  const pending = dailies
    .filter((m) => m.status === 'AVAILABLE' || m.status === 'ACTIVE')
    .sort((a, b) => b.xpReward - a.xpReward);
  const atRisk = streaksNeedingAction(snap.streaks, snap.date)
    .sort((a, b) => b.currentStreak - a.currentStreak);
  const perf = snap.performance;

  const metrics: AINarrationMetric[] = [
    { label: 'PENDING', value: String(pending.length) },
    { label: 'PERFORMANCE', value: `${perf.total}` },
    { label: 'LEVEL', value: String(snap.profile.level) },
    { label: 'STREAKS AT RISK', value: String(atRisk.length) },
  ];

  const insights: AINarrationInsight[] = [];
  insights.push({
    label: 'SYSTEM STATE',
    text: `Life Performance holding at ${perf.total} — ${perf.status}.`,
    tone: toneForScore(perf.total),
  });

  if (atRisk.length > 0) {
    const top = atRisk[0];
    insights.push({
      label: 'STREAK RISK',
      text: `${top.label} streak at ${top.currentStreak}d is unadvanced today. ${atRisk.length} streak(s) need action to survive.`,
      tone: atRisk.length >= 3 ? 'critical' : 'warning',
    });
  }

  const weak = weakestPerfCategory(perf);
  insights.push({
    label: 'WEAK VECTOR',
    text: `${PERF_LABEL[weak.key]} is your lowest category at ${weak.value}. Bias today's effort here.`,
    tone: toneForScore(weak.value),
  });

  // Recommendations: streak protection first, then the highest-value missions.
  const recommendations: AINarrationRecommendation[] = [];
  let priority = 1;
  if (atRisk[0]) {
    recommendations.push({
      priority: priority++,
      title: `Protect the ${atRisk[0].label} streak`,
      reason: `Log it today to keep the ${atRisk[0].currentStreak}-day chain alive.`,
    });
  }
  for (const m of pending.slice(0, 3)) {
    recommendations.push({
      priority: priority++,
      title: m.title,
      reason: `${m.difficulty}-rank · +${m.xpReward} XP. Highest-leverage objective still open.`,
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 1,
      title: 'Generate momentum',
      reason: 'All dailies cleared. Start a Focus session or advance a campaign stage.',
    });
  }

  const headline =
    pending.length > 0
      ? `MORNING DIRECTIVE — ${pending.length} objective${pending.length === 1 ? '' : 's'} queued.`
      : 'MORNING DIRECTIVE — queue clear. Seize the surplus.';

  return {
    kind: 'MORNING',
    date: snap.date,
    generatedAt: snap.generatedAt,
    headline,
    status: perf.status,
    metrics,
    insights,
    recommendations,
  };
}

// ── EVENING ────────────────────────────────────────────────────────
export function buildEveningReport(snap: EchoSnapshot): EchoReport {
  const dailies = todaysDailies(snap.missions, snap.date).filter((m) => m.type === 'DAILY');
  const done = dailies.filter((m) => m.status === 'COMPLETED');
  const failed = dailies.filter((m) => m.status === 'FAILED');
  const openCount = dailies.length - done.length - failed.length;
  const completion = dailies.length > 0 ? Math.round((done.length / dailies.length) * 100) : 0;
  const focusMin = focusMinutesOn(snap.focusSessions, snap.date);
  const focusCount = snap.focusSessions.filter(
    (s) => s.endedAt != null && isSameDay(s.endedAt, snap.date),
  ).length;

  const metrics: AINarrationMetric[] = [
    { label: 'XP TODAY', value: String(snap.dailyXp) },
    { label: 'CLEARED', value: `${done.length}/${dailies.length}` },
    { label: 'COMPLETION', value: `${completion}%` },
    { label: 'FOCUS MIN', value: String(focusMin) },
  ];

  const insights: AINarrationInsight[] = [];
  if (dailies.length > 0) {
    insights.push({
      label: 'THROUGHPUT',
      text:
        completion >= 80
          ? `Strong day — ${done.length}/${dailies.length} objectives cleared (${completion}%).`
          : completion >= 40
            ? `Partial day — ${done.length}/${dailies.length} cleared (${completion}%). ${openCount} still open.`
            : `Low throughput — only ${done.length}/${dailies.length} cleared (${completion}%).`,
      tone: toneForScore(completion),
    });
  } else {
    insights.push({
      label: 'THROUGHPUT',
      text: 'No dailies were tracked today.',
      tone: 'neutral',
    });
  }

  insights.push({
    label: 'DEEP WORK',
    text:
      focusMin > 0
        ? `${focusMin} min of focused work across ${focusCount} session(s).`
        : 'No focus sessions logged today — deep-work vector is idle.',
    tone: focusMin >= 50 ? 'positive' : focusMin > 0 ? 'neutral' : 'warning',
  });

  if (failed.length > 0) {
    insights.push({
      label: 'MISSED',
      text: `${failed.length} objective(s) failed. Non-fatal — the system logs it and recalibrates.`,
      tone: 'warning',
    });
  }

  const recommendations: AINarrationRecommendation[] = [];
  let priority = 1;
  if (openCount > 0) {
    recommendations.push({
      priority: priority++,
      title: `Close ${openCount} open objective(s)`,
      reason: 'Still recoverable tonight before the daily rolls over.',
    });
  }
  recommendations.push({
    priority: priority++,
    title: `Hold the ${snap.profile.wakeTarget} wake target`,
    reason: `Protect ${snap.profile.sleepTargetHours}h of sleep to keep tomorrow's discipline vector intact.`,
  });

  const headline = `DAY REVIEW — ${done.length}/${dailies.length} cleared · +${snap.dailyXp} XP.`;

  return {
    kind: 'EVENING',
    date: snap.date,
    generatedAt: snap.generatedAt,
    headline,
    status: snap.performance.status,
    metrics,
    insights,
    recommendations,
  };
}

// ── WEEKLY (SYSTEM ANALYSIS REPORT) ────────────────────────────────
export function buildWeeklyReport(snap: EchoSnapshot): EchoReport {
  const dayKeys = lastNDayKeys(snap.date, 7);
  const daySet = new Set(dayKeys);

  const completedThisWeek = snap.missions.filter(
    (m) => m.status === 'COMPLETED' && m.completedAt != null && daySet.has(toLocalDateKey(new Date(m.completedAt))),
  );
  const focusThisWeek = snap.focusSessions.filter(
    (s) => s.endedAt != null && daySet.has(toLocalDateKey(new Date(s.endedAt))),
  );
  const focusMin = Math.round(focusThisWeek.reduce((sum, s) => sum + s.activeSeconds, 0) / 60);
  const xpThisWeek = focusThisWeek.reduce((sum, s) => sum + s.xpAwarded, 0)
    + completedThisWeek.reduce((sum, m) => sum + m.xpReward, 0);

  // Active days = distinct days with at least one recorded system event.
  const activeDays = new Set(
    snap.events
      .map((e) => toLocalDateKey(new Date(e.createdAt)))
      .filter((k) => daySet.has(k)),
  ).size;

  const perf = snap.performance;
  const strong = strongestPerfCategory(perf);
  const weak = weakestPerfCategory(perf);
  const bestStreak = [...snap.streaks].sort((a, b) => b.currentStreak - a.currentStreak)[0];

  const metrics: AINarrationMetric[] = [
    { label: 'MISSIONS/WK', value: String(completedThisWeek.length) },
    { label: 'FOCUS HRS', value: (focusMin / 60).toFixed(1) },
    { label: 'ACTIVE DAYS', value: `${activeDays}/7` },
    { label: 'XP/WK', value: String(xpThisWeek) },
  ];

  const insights: AINarrationInsight[] = [
    {
      label: 'CONSISTENCY',
      text:
        activeDays >= 6
          ? `${activeDays}/7 active days — consistency vector is strong.`
          : activeDays >= 3
            ? `${activeDays}/7 active days — consistency is uneven. The gaps are where progression leaks.`
            : `Only ${activeDays}/7 active days. Consistency is the primary bottleneck this week.`,
      tone: toneForScore((activeDays / 7) * 100),
    },
    {
      label: 'STRONGEST',
      text: `${PERF_LABEL[strong.key]} leads at ${strong.value}. This is your reliable engine.`,
      tone: 'positive',
    },
    {
      label: 'WEAKEST',
      text: `${PERF_LABEL[weak.key]} trails at ${weak.value}. Directed effort here yields the largest score gain.`,
      tone: toneForScore(weak.value),
    },
  ];
  if (bestStreak && bestStreak.currentStreak > 0) {
    insights.push({
      label: 'MOMENTUM',
      text: `Longest live chain: ${bestStreak.label} at ${bestStreak.currentStreak}d.`,
      tone: 'positive',
    });
  }

  const recommendations: AINarrationRecommendation[] = [
    {
      priority: 1,
      title: `Raise ${PERF_LABEL[weak.key]}`,
      reason: `Lowest category at ${weak.value}. Allocate next week's marginal effort here for maximum lift.`,
    },
    {
      priority: 2,
      title: activeDays >= 6 ? 'Protect the streak of active days' : 'Close the inactive-day gaps',
      reason:
        activeDays >= 6
          ? 'Consistency is compounding — do not break the chain.'
          : `${7 - activeDays} idle day(s) cost the most progression. Even one small mission counts.`,
    },
  ];

  return {
    kind: 'WEEKLY',
    date: snap.date,
    generatedAt: snap.generatedAt,
    headline: `SYSTEM ANALYSIS — 7-DAY VECTOR · ${completedThisWeek.length} missions · ${(focusMin / 60).toFixed(1)}h focus.`,
    status: perf.status,
    metrics,
    insights,
    recommendations,
  };
}

/** Returns the last N local date keys ending at (and including) `date`. */
function lastNDayKeys(date: string, n: number): string[] {
  const keys: string[] = [];
  const base = new Date(`${date}T00:00:00`);
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    keys.push(toLocalDateKey(d));
  }
  return keys;
}

/** Attribute display name for a code (used by the ECHO screen). */
export function attributeName(code: AttributeCode): string {
  return ATTR_NAME[code];
}

/** Map a computed report to the provider fact sheet (privacy-safe by construction). */
export function toNarrationRequest(report: EchoReport): AINarrationRequest {
  return {
    kind: report.kind,
    headline: report.headline,
    status: report.status,
    metrics: report.metrics,
    insights: report.insights,
    recommendations: report.recommendations,
  };
}
