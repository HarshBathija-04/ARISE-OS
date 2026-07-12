import { requireUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { RarityBadge, ProgressBar } from "@/components/ui/bars";
import { Trophy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AchievementsPage() {
  const userId = await requireUserId();
  const rows = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });

  const unlocked = rows.filter((r) => r.unlocked);
  const visible = rows
    .filter((r) => !r.unlocked && !r.achievement.hidden)
    .sort((a, b) => b.progress / b.achievement.targetValue - a.progress / a.achievement.targetValue);
  const hiddenCount = rows.filter((r) => !r.unlocked && r.achievement.hidden).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Progression</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Achievements</h1>
        <p className="mt-1 text-sm text-slate-500">
          {unlocked.length}/{rows.length} unlocked · {hiddenCount} hidden achievements await discovery.
        </p>
      </div>

      {unlocked.length > 0 && (
        <div>
          <div className="sys-label mb-3">Unlocked</div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {unlocked.map((r) => (
              <Panel key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <Trophy className="h-5 w-5 text-rank-gold" />
                  <RarityBadge rarity={r.achievement.rarity} />
                </div>
                <h3 className="mt-2 font-display font-semibold text-slate-100">{r.achievement.title}</h3>
                <p className="text-xs text-slate-500">{r.achievement.description}</p>
                <div className="mt-2 font-mono text-[10px] text-arc-cyan">+{r.achievement.xpReward} XP · +{r.achievement.coinReward} coins</div>
              </Panel>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="sys-label mb-3">In Progress</div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <Panel key={r.id} className={cn("p-4")}>
              <div className="flex items-center justify-between">
                <Trophy className="h-5 w-5 text-slate-600" />
                <RarityBadge rarity={r.achievement.rarity} />
              </div>
              <h3 className="mt-2 font-display font-semibold text-slate-300">{r.achievement.title}</h3>
              <p className="text-xs text-slate-500">{r.achievement.description}</p>
              <div className="mt-3">
                <ProgressBar value={r.progress} max={r.achievement.targetValue} glow={false} />
                <div className="mt-1 font-mono text-[10px] text-slate-600">
                  {r.progress}/{r.achievement.targetValue}
                </div>
              </div>
            </Panel>
          ))}
          {hiddenCount > 0 && (
            <Panel className="flex flex-col items-center justify-center gap-2 p-6 text-center">
              <Lock className="h-6 w-6 text-slate-600" />
              <p className="text-sm text-slate-400">{hiddenCount} hidden achievements</p>
              <p className="text-xs text-slate-600">Play the System to reveal them.</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
