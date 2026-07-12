"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, HeartPulse } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { completeRecoveryAction } from "@/app/actions";

export function RecoveryQuestCard({ id, steps }: { id: string; steps: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(steps.map(() => false));
  const [pending, startTransition] = useTransition();
  const allDone = checked.every(Boolean);

  function toggle(i: number) {
    setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)));
  }

  function complete() {
    startTransition(async () => {
      await completeRecoveryAction({ id });
    });
  }

  return (
    <Panel glow className="p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-success/30 bg-success/10">
          <HeartPulse className="h-6 w-6 text-success" />
        </div>
        <div>
          <div className="sys-label">Active Recovery Quest</div>
          <h3 className="font-display text-lg font-bold text-slate-100">Reclaim Control</h3>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-400">
        No progress was lost. Move through these steps at your own pace — each one is a rep of discipline.
      </p>

      <div className="mt-4 space-y-2">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className="flex w-full items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.04]"
          >
            {checked[i] ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-slate-600" />
            )}
            <span className={checked[i] ? "text-sm text-slate-500 line-through" : "text-sm text-slate-200"}>{step}</span>
          </button>
        ))}
      </div>

      <button onClick={complete} disabled={!allDone || pending} className="btn-primary mt-5 w-full">
        {allDone ? "Complete Recovery" : `Finish all steps (${checked.filter(Boolean).length}/${steps.length})`}
      </button>
    </Panel>
  );
}
