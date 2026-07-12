import { requireUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { FocusMode } from "@/components/game/focus-mode";

export default async function FocusPage() {
  const userId = await requireUserId();
  const today = gameDay();
  const [todaySessions, agg] = await Promise.all([
    prisma.focusSession.count({ where: { userId, startedAt: { gte: today }, endedAt: { not: null } } }),
    prisma.focusSession.aggregate({
      _sum: { actualMin: true },
      where: { userId, startedAt: { gte: today } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Core</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Focus Mode</h1>
        <p className="mt-1 text-sm text-slate-500">
          Today: {todaySessions} session{todaySessions === 1 ? "" : "s"} · {agg._sum.actualMin ?? 0} focused minutes
        </p>
      </div>

      <Panel glow>
        <PanelHeader label="Deep Work" title="Enter the Shaft" />
        <div className="p-6">
          <FocusMode />
        </div>
      </Panel>
    </div>
  );
}
