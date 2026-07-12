"use client";

import { useState, useTransition } from "react";
import { Panel } from "@/components/ui/panel";
import { logMetricAction } from "@/app/actions";

const FIELDS = [
  { kind: "sleep_hours", label: "Sleep (h)", step: 0.5, max: 12 },
  { kind: "steps", label: "Steps", step: 100, max: 50000 },
  { kind: "run_km", label: "Run (km)", step: 0.5, max: 100 },
  { kind: "reels_minutes", label: "Reels (min)", step: 5, max: 600 },
  { kind: "gaming_minutes", label: "Gaming (min)", step: 5, max: 600 },
] as const;

export function MetricLogger() {
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<string | null>(null);

  function log(kind: string) {
    const value = values[kind] ?? 0;
    startTransition(async () => {
      await logMetricAction({ kind: kind as never, value });
      setSaved(kind);
      setTimeout(() => setSaved(null), 1500);
    });
  }

  return (
    <Panel className="p-5">
      <div className="sys-label mb-3">Log Today&apos;s Metrics</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <div key={f.kind} className="flex items-center gap-2">
            <div className="flex-1">
              <label className="sys-label">{f.label}</label>
              <input
                type="number" min={0} max={f.max} step={f.step}
                value={values[f.kind] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.kind]: Number(e.target.value) }))}
                className="mt-1 w-full rounded-md border border-white/[0.08] bg-void-800/60 px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-arc-blue/40"
              />
            </div>
            <button onClick={() => log(f.kind)} disabled={pending} className="btn-ghost mt-4 !py-1.5 text-xs">
              {saved === f.kind ? "✓" : "Log"}
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
