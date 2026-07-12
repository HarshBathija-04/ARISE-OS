import { requireUserId } from "@/lib/current-user";
import { getOpenRecoveryQuest } from "@/lib/player-data";
import { prisma } from "@/lib/prisma";
import { Panel, EmptyState } from "@/components/ui/panel";
import { RecoveryQuestCard } from "./recovery-quest";
import { HeartPulse, ShieldCheck } from "lucide-react";

export default async function RecoveryPage() {
  const userId = await requireUserId();
  const [open, history] = await Promise.all([
    getOpenRecoveryQuest(userId),
    prisma.recoveryQuest.findMany({ where: { userId, completed: true }, orderBy: { completedAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Discipline</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Recovery Center</h1>
        <p className="mt-1 text-sm text-slate-500">Turning slips into reps. Recovery is a skill you are training.</p>
      </div>

      {open ? (
        <RecoveryQuestCard id={open.id} steps={open.steps as string[]} />
      ) : (
        <Panel>
          <EmptyState
            icon={<ShieldCheck className="h-8 w-8" />}
            title="No active recovery quest"
            hint="You're steady right now. If a slip happens, the System will place a short recovery sequence here — no punishment, just a path back."
          />
        </Panel>
      )}

      {history.length > 0 && (
        <Panel className="p-5">
          <div className="sys-label mb-3">Recoveries Completed · {history.length}</div>
          <div className="space-y-2">
            {history.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm text-slate-400">
                <HeartPulse className="h-4 w-4 text-success" />
                <span>{r.reason}</span>
                <span className="ml-auto font-mono text-xs text-slate-600">
                  {r.completedAt?.toLocaleDateString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
