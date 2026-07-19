/**
 * Planned vs Actual analytics — server component fed by
 * GET /v1/time-logs/analytics. Compares the timetable (plan) against the
 * Time Log (reality).
 */
import { Clock, Flame, Target, TrendingUp, Zap } from "lucide-react";

export interface DayAnalytics {
  date: string;
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
  productivityScore: number;
  timeUtilization: number;
  xpFromLogs: number;
  logCount: number;
}

export interface TimeLogAnalyticsData {
  days: DayAnalytics[];
  totals: Omit<DayAnalytics, "date">;
  previousWeek: { actualMin: number; focusMin: number; productivityScore: number; xpFromLogs: number };
  previousMonth: { actualMin: number };
}

function hrs(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function delta(current: number, prev: number): string {
  if (prev <= 0) return current > 0 ? "new" : "—";
  const pct = Math.round(((current - prev) / prev) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function Stat({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className={`sys-label flex items-center gap-1.5 ${accent}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-2 font-mono text-xl font-bold text-slate-100">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function TimeLogAnalyticsPanel({ analytics }: { analytics: TimeLogAnalyticsData }) {
  const t = analytics.totals;
  const w = analytics.previousWeek;

  const rows: { label: string; min: number; className: string }[] = [
    { label: "Coding", min: t.codingMin, className: "bg-arc-cyan" },
    { label: "Study", min: t.studyMin, className: "bg-arc-blue" },
    { label: "Exercise", min: t.exerciseMin, className: "bg-success" },
    { label: "Entertainment", min: t.entertainmentMin, className: "bg-slate-500" },
  ];
  const maxCat = Math.max(1, ...rows.map((r) => r.min));

  return (
    <div className="space-y-5">
      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Clock} label="Planned" value={hrs(t.plannedMin)} accent="text-arc-blue"
          sub={`${hrs(t.actualMin)} actually logged`} />
        <Stat icon={Flame} label="Focus Time" value={hrs(t.focusMin)}
          sub={`${hrs(t.deepWorkMin)} deep work · ${delta(t.focusMin, w.focusMin)} vs prev week`}
          accent="text-arc-cyan" />
        <Stat icon={Target} label="Productivity" value={`${t.productivityScore}/100`}
          sub={`${delta(t.productivityScore, w.productivityScore)} vs prev week`} accent="text-success" />
        <Stat icon={Zap} label="XP from Logs" value={`${t.xpFromLogs}`}
          sub={`${t.logCount} activities logged`} accent="text-rank-gold" />
      </div>

      {/* Utilization + missed/recovered */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <p className="sys-label flex items-center gap-1.5 text-arc-violet">
            <TrendingUp className="h-3.5 w-3.5" /> Time Utilization
          </p>
          <span className="font-mono text-sm font-bold text-slate-200">{t.timeUtilization}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-arc-blue via-arc-cyan to-success"
            style={{ width: `${t.timeUtilization}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <span className="text-danger">Missed: {hrs(t.missedMin)}</span>
          <span className="text-success">Recovered: {hrs(t.recoveredMin)}</span>
          <span className="text-slate-500">
            Recovered time = skipped plan periods covered by productive Time Logs.
          </span>
        </div>
      </div>

      {/* Category hours */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="sys-label mb-3">Hours by Category (last {analytics.days.length} days)</p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-slate-400">{r.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className={`h-full rounded-full ${r.className}`} style={{ width: `${(r.min / maxCat) * 100}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-xs text-slate-300">{hrs(r.min)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily planned vs actual */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="sys-label mb-3">Planned vs Actual per Day</p>
        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {analytics.days.map((d) => {
            const max = Math.max(1, ...analytics.days.map((x) => Math.max(x.plannedMin, x.actualMin)));
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <div
                    className="w-2.5 rounded-t bg-white/15"
                    style={{ height: `${(d.plannedMin / max) * 100}%` }}
                    title={`Planned ${hrs(d.plannedMin)}`}
                  />
                  <div
                    className="w-2.5 rounded-t bg-arc-cyan"
                    style={{ height: `${(d.actualMin / max) * 100}%` }}
                    title={`Actual ${hrs(d.actualMin)}`}
                  />
                </div>
                <span className="font-mono text-[9px] text-slate-600">{d.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-white/15" /> Planned
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-arc-cyan" /> Actual
          </span>
        </div>
      </div>
    </div>
  );
}
