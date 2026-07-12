import { requireUserId } from "@/lib/current-user";
import { getActiveBossBattles } from "@/lib/player-data";
import { prisma } from "@/lib/prisma";
import { BossPanel } from "@/components/game/boss-panel";
import { Panel } from "@/components/ui/panel";
import { RarityBadge } from "@/components/ui/bars";
import { Skull, Lock } from "lucide-react";

export default async function BossesPage() {
  const userId = await requireUserId();
  const [battles, allBosses] = await Promise.all([
    getActiveBossBattles(userId),
    prisma.boss.findMany(),
  ]);

  const engagedKeys = new Set(battles.map((b) => b.boss.key));
  const upcoming = allBosses.filter((b) => !engagedKeys.has(b.key));
  const active = battles.filter((b) => b.status === "ACTIVE");
  const defeated = battles.filter((b) => b.status === "DEFEATED");

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Progression</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Boss Battles</h1>
        <p className="mt-1 text-sm text-slate-500">Major challenges. Your real actions deal the damage.</p>
      </div>

      {active.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {active.map((b) => <BossPanel key={b.id} battle={b} />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <div className="sys-label mb-3">Awaiting Encounter</div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((b) => (
              <Panel key={b.id} className="p-4 opacity-80">
                <div className="flex items-center justify-between">
                  <Skull className="h-5 w-5 text-slate-500" />
                  <RarityBadge rarity={b.rarity} />
                </div>
                <h3 className="mt-2 font-display font-semibold text-slate-200">{b.name}</h3>
                <p className="text-xs italic text-slate-500">{b.tagline}</p>
                <p className="mt-2 text-xs text-slate-500">{b.description}</p>
                <div className="mt-3 flex items-center gap-1 font-mono text-[10px] text-slate-600">
                  <Lock className="h-3 w-3" /> {b.maxHp} HP · reward +{b.rewardXp} XP
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {defeated.length > 0 && (
        <div>
          <div className="sys-label mb-3">Defeated</div>
          <div className="grid gap-5 lg:grid-cols-2">
            {defeated.map((b) => <BossPanel key={b.id} battle={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}
