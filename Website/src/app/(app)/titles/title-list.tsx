"use client";

import { useState, useTransition } from "react";
import { Crown, Check } from "lucide-react";
import type { Rarity } from "@prisma/client";
import { Panel } from "@/components/ui/panel";
import { RarityBadge } from "@/components/ui/bars";
import { equipTitleAction } from "@/app/actions";

export interface TitleVM {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  xpBonusPct: number;
  owned: boolean;
}

export function TitleList({ titles, equippedId }: { titles: TitleVM[]; equippedId: string | null }) {
  const [equipped, setEquipped] = useState(equippedId);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function equip(id: string) {
    setBusyId(id);
    startTransition(async () => {
      try {
        await equipTitleAction({ titleId: id });
        setEquipped(id);
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {titles.map((t) => {
        const isEquipped = equipped === t.id;
        return (
          <Panel key={t.id} className={`p-4 ${!t.owned ? "opacity-60" : ""} ${isEquipped ? "panel-glow" : ""}`}>
            <div className="flex items-center justify-between">
              <Crown className={isEquipped ? "h-5 w-5 text-rank-gold" : "h-5 w-5 text-slate-500"} />
              <RarityBadge rarity={t.rarity} />
            </div>
            <h3 className="mt-2 font-display font-semibold text-slate-100">{t.name}</h3>
            <p className="text-xs text-slate-500">{t.description}</p>
            {t.xpBonusPct > 0 && (
              <div className="mt-1 font-mono text-[10px] text-arc-cyan">+{Math.round(t.xpBonusPct * 100)}% XP</div>
            )}
            <div className="mt-3">
              {!t.owned ? (
                <span className="chip border border-white/[0.06] bg-white/[0.02] text-slate-500">Locked</span>
              ) : isEquipped ? (
                <span className="chip border border-rank-gold/40 bg-rank-gold/10 text-rank-gold">
                  <Check className="h-3 w-3" /> Equipped
                </span>
              ) : (
                <button onClick={() => equip(t.id)} disabled={pending && busyId === t.id} className="btn-ghost !py-1 text-xs">
                  Equip
                </button>
              )}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
