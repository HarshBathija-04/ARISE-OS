import { requireUserId } from "@/lib/current-user";
import { getShadowHabitStatus } from "@/lib/player-data";
import { prisma } from "@/lib/prisma";
import { ShadowPanel, type ShadowVM } from "./shadow-panel";
import { Panel } from "@/components/ui/panel";

export default async function ShadowPage() {
  const userId = await requireUserId();
  const [status, urges] = await Promise.all([
    getShadowHabitStatus(userId),
    prisma.urgeLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const vms: ShadowVM[] = status.map((s) => ({
    key: s.key, title: s.title,
    current: s.streak?.current ?? 0, longest: s.streak?.longest ?? 0,
  }));

  const resisted = urges.filter((u) => u.resisted).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Discipline</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Shadow Habits</h1>
        <p className="mt-1 text-sm text-slate-500">Private tracking · {resisted} urges resisted recently.</p>
      </div>

      <ShadowPanel habits={vms} />

      {urges.length > 0 && (
        <Panel className="p-5">
          <div className="sys-label mb-3">Recent Urge Patterns</div>
          <div className="space-y-2">
            {urges.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm">
                <span className={u.resisted ? "text-success" : "text-slate-400"}>
                  {u.resisted ? "Resisted" : "Slip"} · {u.habitKey}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {[u.trigger, u.mood, u.location].filter(Boolean).join(" · ") || "no notes"}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
