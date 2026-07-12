import { Skull, Zap } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { RarityBadge } from "@/components/ui/bars";
import { cn, pct } from "@/lib/utils";
import type { Boss, BossBattle, BossBattleLog } from "@prisma/client";

type BattleWithBoss = BossBattle & { boss: Boss; logs: BossBattleLog[] };

export function BossPanel({ battle, compact }: { battle: BattleWithBoss; compact?: boolean }) {
  const hpPct = pct(battle.currentHp, battle.maxHp);
  const phases = (battle.boss.phases as Array<{ name: string; note: string }>) ?? [];
  const phase = phases[battle.phase];
  const defeated = battle.status === "DEFEATED";

  return (
    <Panel className={cn("overflow-hidden", defeated && "opacity-70")}>
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-rank-mythic/10 blur-3xl" />
      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-rank-mythic/30 bg-rank-mythic/10">
              <Skull className="h-6 w-6 text-rank-mythic" />
            </div>
            <div>
              <div className="sys-label">{defeated ? "Boss Defeated" : "Active Boss"}</div>
              <h3 className="font-display text-lg font-bold text-slate-100">{battle.boss.name}</h3>
              <p className="text-xs italic text-slate-500">{battle.boss.tagline}</p>
            </div>
          </div>
          <RarityBadge rarity={battle.boss.rarity} />
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="sys-label">HP {phase ? `· ${phase.name}` : ""}</span>
            <span className="font-mono text-xs text-slate-400">
              {battle.currentHp} / {battle.maxHp}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-700 via-rank-mythic to-rose-400 transition-[width] duration-700"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {!compact && (
          <>
            <p className="mt-3 text-sm text-slate-400">{battle.boss.description}</p>
            {battle.logs.length > 0 && (
              <div className="mt-4">
                <div className="sys-label mb-2">Battle Log</div>
                <div className="space-y-1">
                  {battle.logs.slice(0, 6).map((log) => (
                    <div key={log.id} className="flex items-center justify-between font-mono text-xs">
                      <span className="text-slate-500">
                        <Zap className="mr-1 inline h-3 w-3 text-arc-blue" />
                        {log.action}
                        {log.critical && <span className="ml-1 text-rank-gold">CRIT</span>}
                      </span>
                      <span className={log.damage >= 0 ? "text-danger" : "text-success"}>
                        {log.damage >= 0 ? "-" : "+"}
                        {Math.abs(log.damage)} HP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-600">
              Real actions deal damage: deep work −10 · study −12 · workout −15 · every 5th hit crits ×2.
            </p>
          </>
        )}
      </div>
    </Panel>
  );
}
