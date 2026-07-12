import { requireUserId } from "@/lib/current-user";
import { getStreaks, getUnusedShields } from "@/lib/player-data";
import { Panel } from "@/components/ui/panel";
import { Flame, Shield } from "lucide-react";

export default async function StreaksPage() {
  const userId = await requireUserId();
  const [streaks, shields] = await Promise.all([getStreaks(userId), getUnusedShields(userId)]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="sys-label">Progression</p>
          <h1 className="font-display text-2xl font-bold text-slate-100">Streaks</h1>
          <p className="mt-1 text-sm text-slate-500">Earn a Streak Shield every 7 perfect days. A shield absorbs one missed day.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-arc-blue/30 bg-arc-blue/10 px-4 py-2">
          <Shield className="h-5 w-5 text-arc-blue" />
          <span className="font-display text-lg font-bold text-arc-blue">{shields}</span>
          <span className="sys-label">shields</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {streaks.map((s) => (
          <Panel key={s.id} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">{s.title}</span>
              <Flame className={s.current > 0 ? "h-5 w-5 text-amber-400" : "h-5 w-5 text-slate-600"} />
            </div>
            <div className="mt-2 flex items-end gap-3">
              <div>
                <div className="font-display text-3xl font-bold text-slate-100">{s.current}</div>
                <div className="sys-label">current</div>
              </div>
              <div className="mb-1 text-xs text-slate-500">best {s.longest}</div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
