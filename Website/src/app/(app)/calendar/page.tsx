import { requireUserId } from "@/lib/current-user";
import { getHeatmap, getDailyMetrics } from "@/lib/player-data";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

const INTENSITY = [
  "bg-white/[0.03] text-slate-600",
  "bg-arc-blue/10 text-slate-400",
  "bg-arc-blue/20 text-slate-300",
  "bg-arc-blue/35 text-slate-100",
  "bg-arc-blue/60 text-white shadow-glow",
];

export default async function CalendarPage() {
  const userId = await requireUserId();
  const [heatmap, metrics] = await Promise.all([
    getHeatmap(userId, 35),
    getDailyMetrics(userId, 35),
  ]);
  const byKey = new Map(metrics.map((m) => [m.dayKey, m]));

  // Pad to align first day to weekday.
  const first = heatmap[0];
  const firstDow = first ? new Date(first.date + "T00:00:00Z").getUTCDay() : 0;
  const pad = Array.from({ length: firstDow }, () => null);
  const cells = [...pad, ...heatmap];

  const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Insight</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Calendar</h1>
        <p className="mt-1 text-sm text-slate-500">Last 5 weeks · brightness = routine completion.</p>
      </div>

      <Panel className="p-5">
        <div className="mb-2 grid grid-cols-7 gap-2">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="sys-label text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell, i) =>
            cell === null ? (
              <div key={`pad-${i}`} />
            ) : (
              <div
                key={cell.date}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-lg text-xs",
                  INTENSITY[Math.min(cell.intensity, 4)],
                )}
              >
                <span className="font-mono">{cell.date.slice(8)}</span>
                {(() => {
                  const m = byKey.get(cell.date);
                  const mins = m ? Math.round(m.studyMinutes) : 0;
                  return mins > 0 ? <span className="text-[9px] opacity-70">{mins}m</span> : null;
                })()}
              </div>
            ),
          )}
        </div>
      </Panel>
    </div>
  );
}
