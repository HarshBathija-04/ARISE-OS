"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Swords, CheckCircle2, Circle, Plus, Loader2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/bars";
import { pct } from "@/lib/utils";
import { logMainQuestProgressAction } from "@/app/actions";
import { AwardToast, LevelUpOverlay, type AwardResult } from "@/components/game/award-feedback";

export interface StageVM {
  id: string;
  title: string;
  description: string;
  targetUnits: number;
  progress: number;
  completed: boolean;
}
export interface MainQuestVM {
  id: string;
  title: string;
  description: string;
  theme: string;
  stages: StageVM[];
}

export function MainQuestBoard({ quests }: { quests: MainQuestVM[] }) {
  const router = useRouter();
  const [award, setAward] = useState<AwardResult | null>(null);
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function log(stageId: string, amount: number) {
    setPendingStage(stageId);
    startTransition(async () => {
      try {
        const res = await logMainQuestProgressAction({ stageId, amount });
        if (res.award) setAward(res.award);
        router.refresh();
      } finally {
        setPendingStage(null);
      }
    });
  }

  return (
    <>
      <AwardToast award={award} onDone={() => setAward(null)} />
      <LevelUpOverlay award={award} onDone={() => setAward(null)} />

      <div className="grid gap-5 lg:grid-cols-2">
        {quests.map((mq) => {
          const cleared = mq.stages.filter((s) => s.completed).length;
          const totalUnits = mq.stages.reduce((s, x) => s + x.targetUnits, 0);
          const doneUnits = mq.stages.reduce((s, x) => s + Math.min(x.progress, x.targetUnits), 0);
          const activeStageId = mq.stages.find((s) => !s.completed)?.id ?? null;
          const allDone = activeStageId === null;

          return (
            <Panel key={mq.id} className="overflow-hidden">
              <div
                className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-3xl"
                style={{ background: mq.theme }}
              />
              <div className="relative p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg border"
                    style={{ borderColor: `${mq.theme}55`, background: `${mq.theme}12` }}
                  >
                    <Swords className="h-5 w-5" style={{ color: mq.theme }} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-100">{mq.title}</h3>
                    <p className="text-xs text-slate-500">{mq.description}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-500">
                      {cleared}/{mq.stages.length} stages
                    </span>
                    <span className="font-mono text-slate-400">{pct(doneUnits, totalUnits)}%</span>
                  </div>
                  <ProgressBar value={doneUnits} max={totalUnits} barClassName="" />
                </div>

                <div className="mt-4 space-y-1.5">
                  {mq.stages.map((s) => {
                    const isActive = s.id === activeStageId;
                    const busy = pendingStage === s.id;
                    return (
                      <div key={s.id}>
                        <div className="flex items-center gap-2 text-sm">
                          {s.completed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <Circle className={`h-4 w-4 shrink-0 ${isActive ? "text-arc-blue" : "text-slate-600"}`} />
                          )}
                          <span className={s.completed ? "text-slate-500 line-through" : isActive ? "text-slate-100" : "text-slate-400"}>
                            {s.title}
                          </span>
                          {!s.completed && (
                            <span className="ml-auto font-mono text-[10px] text-slate-500">
                              {s.progress}/{s.targetUnits}
                            </span>
                          )}
                        </div>

                        {/* Progress controls on the current (active) stage only */}
                        {isActive && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-arc-blue/15 bg-arc-blue/[0.04] p-2">
                            <span className="sys-label pl-1 pr-1">Log progress</span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => log(s.id, 1)}
                              className="btn-ghost !px-2 !py-1 text-xs disabled:opacity-40"
                            >
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} 1
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => log(s.id, 5)}
                              className="btn-ghost !px-2 !py-1 text-xs disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" /> 5
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => log(s.id, 10)}
                              className="btn-ghost !px-2 !py-1 text-xs disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" /> 10
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {allDone && (
                  <div className="mt-4 rounded-lg border border-success/25 bg-success/[0.05] px-3 py-2 text-center text-xs font-medium text-success">
                    Main quest complete — all stages cleared.
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
