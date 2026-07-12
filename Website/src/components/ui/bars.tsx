import type { Difficulty, Rarity } from "@prisma/client";
import { cn, pct } from "@/lib/utils";

export function ProgressBar({
  value,
  max,
  className,
  barClassName,
  glow = true,
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
  glow?: boolean;
}) {
  const p = pct(value, max);
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-arc-blue-dim via-arc-blue to-arc-cyan transition-[width] duration-700 ease-out",
          glow && "shadow-glow",
          barClassName,
        )}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

export function XpBar({ current, needed }: { current: number; needed: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="sys-label">XP</span>
        <span className="font-mono text-xs text-slate-400">
          {current.toLocaleString()} / {isFinite(needed) ? needed.toLocaleString() : "MAX"}
        </span>
      </div>
      <ProgressBar value={current} max={isFinite(needed) ? needed : current || 1} />
    </div>
  );
}

const DIFF_LABEL: Record<Difficulty, string> = {
  E: "E", D: "D", C: "C", B: "B", A: "A", S: "S", SS: "SS",
};

export function DifficultyChip({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={cn("chip", `diff-${difficulty}`)}>
      RANK {DIFF_LABEL[difficulty]}
    </span>
  );
}

const RARITY_STYLE: Record<Rarity, string> = {
  COMMON: "text-slate-300 border-slate-500/30 bg-slate-500/10",
  RARE: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  EPIC: "text-violet-300 border-violet-500/30 bg-violet-500/10",
  LEGENDARY: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  MYTHIC: "text-rose-300 border-rose-500/40 bg-rose-500/10",
};

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span className={cn("chip border", RARITY_STYLE[rarity])}>{rarity}</span>
  );
}
