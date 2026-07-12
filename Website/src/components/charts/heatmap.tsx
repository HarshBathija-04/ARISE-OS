import { cn } from "@/lib/utils";

const LEVELS = [
  "bg-white/[0.04]",
  "bg-arc-blue/20",
  "bg-arc-blue/40",
  "bg-arc-blue/60",
  "bg-arc-blue/90 shadow-glow",
];

export function Heatmap({ cells }: { cells: { date: string; intensity: number }[] }) {
  // Group into weeks (columns of 7).
  const weeks: { date: string; intensity: number }[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date} · ${cell.intensity * 25}% complete`}
                className={cn("h-3 w-3 rounded-[3px]", LEVELS[Math.min(cell.intensity, 4)])}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span className="sys-label mr-1">less</span>
        {LEVELS.map((l, i) => (
          <div key={i} className={cn("h-3 w-3 rounded-[3px]", l)} />
        ))}
        <span className="sys-label ml-1">more</span>
      </div>
    </div>
  );
}
