import type { Attribute } from "@prisma/client";
import { ProgressBar } from "@/components/ui/bars";
import { attributeDef } from "@/lib/game-engine/attributes";
import { attrXpForLevel } from "@/lib/game-engine/xp-engine";

export function AttributeGrid({ attributes }: { attributes: Attribute[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {attributes.map((a) => {
        const def = attributeDef(a.key);
        const need = attrXpForLevel(a.level);
        return (
          <div key={a.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold tracking-widest" style={{ color: def.color }}>
                {a.key}
              </span>
              <span className="font-display text-lg font-bold text-slate-100">{a.level}</span>
            </div>
            <div className="mt-2">
              <ProgressBar
                value={a.xp}
                max={need}
                glow={false}
                barClassName=""
              />
            </div>
            <div className="mt-1 font-mono text-[10px] text-slate-600">
              {a.xp}/{need}
            </div>
          </div>
        );
      })}
    </div>
  );
}
