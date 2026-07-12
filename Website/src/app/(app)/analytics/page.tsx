import { requireUserId } from "@/lib/current-user";
import { getDailyMetrics, getHeatmap, getPerformance } from "@/lib/player-data";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Heatmap } from "@/components/charts/heatmap";
import { StudyFocusChart, DistractionChart, ScoreRadar } from "@/components/charts/trend-charts";
import { MetricLogger } from "./metric-logger";

export default async function AnalyticsPage() {
  const userId = await requireUserId();
  const [metrics, heatmap, perf] = await Promise.all([
    getDailyMetrics(userId, 30),
    getHeatmap(userId, 120),
    getPerformance(userId),
  ]);

  const byKey = new Map(metrics.map((m) => [m.dayKey, m]));
  const last14 = heatmap.slice(-14).map((c) => {
    const m = byKey.get(c.date);
    const label = c.date.slice(5);
    return {
      day: label,
      study: Math.round(m?.studyMinutes ?? 0),
      focus: Math.round(m?.focusMinutes ?? 0),
      distraction: Math.round(m?.distractionMinutes ?? 0),
    };
  });

  const radar = [
    { axis: "Discipline", value: perf.discipline },
    { axis: "Knowledge", value: perf.knowledge },
    { axis: "Physical", value: perf.physical },
    { axis: "Focus", value: perf.focus },
    { axis: "Recovery", value: perf.recovery },
  ];

  const totalStudy = metrics.reduce((s, m) => s + m.studyMinutes, 0);
  const totalDsa = metrics.reduce((s, m) => s + m.dsaSolved, 0);
  const totalFocus = metrics.reduce((s, m) => s + m.focusMinutes, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Insight</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Transparent metrics over the last 30 days.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Study (30d)" value={`${Math.round(totalStudy / 60)}h`} />
        <Kpi label="DSA solved (30d)" value={String(totalDsa)} />
        <Kpi label="Focus (30d)" value={`${Math.round(totalFocus / 60)}h`} />
      </div>

      <Panel>
        <PanelHeader label="Consistency" title="Activity Heatmap (120 days)" />
        <div className="p-5">
          <Heatmap cells={heatmap} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader label="Trend" title="Study & Focus (14 days)" />
          <div className="p-4"><StudyFocusChart data={last14} /></div>
        </Panel>
        <Panel>
          <PanelHeader label="Balance" title="Performance Radar" />
          <div className="p-4"><ScoreRadar data={radar} /></div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader label="Distraction" title="Distraction Minutes (14 days)" />
        <div className="p-4"><DistractionChart data={last14} /></div>
      </Panel>

      <MetricLogger />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-4">
      <div className="font-display text-3xl font-bold text-arc-cyan">{value}</div>
      <div className="sys-label mt-1">{label}</div>
    </Panel>
  );
}
