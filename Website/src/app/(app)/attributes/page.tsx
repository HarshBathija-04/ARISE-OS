import { requireUserId } from "@/lib/current-user";
import { getAttributes } from "@/lib/player-data";
import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/bars";
import { attributeDef } from "@/lib/game-engine/attributes";
import { attrXpForLevel } from "@/lib/game-engine/xp-engine";
import { pct } from "@/lib/utils";

export default async function AttributesPage() {
  const userId = await requireUserId();
  const attributes = await getAttributes(userId);

  // recent contributions per attribute (last 20 history rows)
  const history = await prisma.attributeHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Progression</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Attributes</h1>
        <p className="mt-1 text-sm text-slate-500">Every real action feeds an attribute. Attributes level on a faster curve than you do.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {attributes.map((a) => {
          const def = attributeDef(a.key);
          const need = attrXpForLevel(a.level);
          const recent = history.filter((h) => h.key === a.key).slice(0, 4);
          return (
            <Panel key={a.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-xs font-bold tracking-widest" style={{ color: def.color }}>{a.key}</div>
                  <div className="font-display text-lg font-semibold text-slate-100">{def.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl font-bold" style={{ color: def.color }}>{a.level}</div>
                  <div className="sys-label">level</div>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">{def.blurb}</p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between font-mono text-[11px] text-slate-500">
                  <span>{a.xp}/{need} XP</span>
                  <span>{pct(a.xp, need)}%</span>
                </div>
                <ProgressBar value={a.xp} max={need} glow={false} />
              </div>
              <div className="mt-3 border-t border-white/[0.06] pt-3">
                <div className="sys-label mb-1">Recent Contributions</div>
                {recent.length === 0 ? (
                  <p className="text-xs text-slate-600">No activity yet — complete quests to grow {a.key}.</p>
                ) : (
                  <div className="space-y-1">
                    {recent.map((h) => (
                      <div key={h.id} className="flex justify-between font-mono text-[11px]">
                        <span className="text-slate-500">{h.source}</span>
                        <span style={{ color: def.color }}>+{h.xpDelta}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
