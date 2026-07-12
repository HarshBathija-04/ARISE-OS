import { requireUserId } from "@/lib/current-user";
import { buildInsights } from "@/lib/ai/guide";
import { getPerformance } from "@/lib/player-data";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/bars";
import { FileText } from "lucide-react";

export default async function ReportPage() {
  const userId = await requireUserId();
  const [{ weekly, insights }, perf] = await Promise.all([
    buildInsights(userId),
    getPerformance(userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-arc-blue" />
        <div>
          <p className="sys-label">Insight</p>
          <h1 className="font-display text-2xl font-bold text-slate-100">Weekly System Report</h1>
        </div>
      </div>

      <Panel glow className="p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="sys-label">Period</div>
            <div className="font-display text-lg font-bold text-slate-100">{weekly.periodKey}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-4xl font-bold text-arc-cyan">{weekly.lifeScore}</div>
            <div className="sys-label">life score</div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {[
            ["Discipline", perf.discipline],
            ["Knowledge", perf.knowledge],
            ["Physical", perf.physical],
            ["Focus", perf.focus],
            ["Recovery", perf.recovery],
          ].map(([label, v]) => (
            <div key={label as string}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span className="font-mono text-xs text-slate-300">{v}</span>
              </div>
              <ProgressBar value={v as number} max={100} glow={false} />
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cell label="Study" value={`${weekly.totalStudyHours}h`} />
        <Cell label="Focus" value={`${weekly.totalFocusHours}h`} />
        <Cell label="DSA" value={String(weekly.dsaSolved)} />
        <Cell label="Workouts" value={`${weekly.workoutDays}/7`} />
        <Cell label="Strongest" value={weekly.strongest} />
        <Cell label="Weakest" value={weekly.weakest} />
        <Cell label="Best Day" value={weekly.bestDay?.slice(5) ?? "—"} />
        <Cell label="Worst Day" value={weekly.worstDay?.slice(5) ?? "—"} />
      </div>

      <Panel>
        <PanelHeader label="Analysis" title="What the Data Says" />
        <div className="space-y-2 p-5">
          {insights.map((ins, i) => (
            <p key={i} className="text-sm text-slate-300">• {ins.text}</p>
          ))}
        </div>
        <div className="border-t border-white/[0.06] p-5">
          <div className="sys-label mb-1">Next Week&apos;s Objective</div>
          <p className="text-sm text-slate-100">{weekly.nextObjective}</p>
        </div>
      </Panel>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-4">
      <div className="font-display text-2xl font-bold text-slate-100">{value}</div>
      <div className="sys-label mt-1">{label}</div>
    </Panel>
  );
}
