import { Flame, Shield } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { XpBar } from "@/components/ui/bars";
import type { RankTier } from "@/lib/game-engine/ranks";

export function PlayerCard({
  name,
  level,
  rank,
  rankTier,
  currentXp,
  xpForNext,
  title,
  currentStreak,
  longestStreak,
  lifeScore,
  shields,
  coins,
}: {
  name: string;
  level: number;
  rank: string;
  rankTier: RankTier;
  currentXp: number;
  xpForNext: number;
  title?: string | null;
  currentStreak: number;
  longestStreak: number;
  lifeScore: number;
  shields: number;
  coins: number;
}) {
  return (
    <Panel glow className="overflow-hidden">
      <div className="grid-overlay absolute inset-0 opacity-20" />
      <div
        className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
        style={{ background: rankTier.color }}
      />
      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="sys-label">Player</div>
            <h2 className="font-display text-2xl font-bold text-slate-100">{name}</h2>
            {title && (
              <span
                className="mt-1 inline-block rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest"
                style={{ color: rankTier.color, borderColor: `${rankTier.color}55`, background: `${rankTier.color}12` }}
              >
                {title}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="sys-label">Level</div>
            <div className="font-display text-4xl font-bold" style={{ color: rankTier.color }}>
              {level}
            </div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-slate-400">{rank}</div>
          </div>
        </div>

        <p className="mt-2 text-sm italic text-slate-500">“{rankTier.blurb}”</p>

        <div className="mt-4">
          <XpBar current={currentXp} needed={xpForNext} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Life Score" value={String(lifeScore)} accent />
          <Stat
            label="Streak"
            value={
              <span className="inline-flex items-center gap-1">
                <Flame className="h-4 w-4 text-amber-400" />
                {currentStreak}
              </span>
            }
          />
          <Stat label="Best" value={String(longestStreak)} />
          <Stat
            label="Shields"
            value={
              <span className="inline-flex items-center gap-1">
                <Shield className="h-4 w-4 text-arc-blue" />
                {shields}
              </span>
            }
          />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2">
          <span className="sys-label">Coins</span>
          <span className="font-display text-lg font-semibold text-rank-gold">{coins.toLocaleString()}</span>
        </div>
      </div>
    </Panel>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-center">
      <div className={`font-display text-xl font-semibold ${accent ? "text-arc-cyan" : "text-slate-100"}`}>
        {value}
      </div>
      <div className="sys-label mt-0.5">{label}</div>
    </div>
  );
}
