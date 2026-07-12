"use client";

import { useState, useTransition } from "react";
import { Shield, ShieldAlert, Wind, Check } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { logHabitAction, logUrgeAction } from "@/app/actions";

export interface ShadowVM {
  key: string;
  title: string;
  current: number;
  longest: number;
}

export function ShadowPanel({ habits }: { habits: ShadowVM[] }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [urgeFor, setUrgeFor] = useState<string | null>(null);

  function mark(key: string, result: "CLEAN" | "RELAPSE") {
    setBusy(key + result);
    startTransition(async () => {
      try {
        await logHabitAction({ habitKey: key, result });
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Panel className="border-arc-blue/15 bg-arc-blue/[0.03] p-4">
        <p className="text-sm text-slate-300">
          This space is private and judgment-free. The goal is <span className="text-arc-blue">pattern recognition and recovery</span>,
          not shame. A relapse never costs you levels or achievements — it just starts a short recovery sequence.
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        {habits.map((h) => (
          <Panel key={h.key} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-200">{h.title}</span>
              <span className="font-mono text-xs text-success">{h.current}d clean</span>
            </div>
            <div className="mt-1 text-xs text-slate-600">best streak {h.longest} days</div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => mark(h.key, "CLEAN")}
                disabled={pending && busy === h.key + "CLEAN"}
                className="btn-primary !py-1.5 text-xs"
              >
                <Check className="h-3.5 w-3.5" /> Clean today
              </button>
              <button
                onClick={() => setUrgeFor(urgeFor === h.key ? null : h.key)}
                className="btn-ghost !py-1.5 text-xs"
              >
                <Wind className="h-3.5 w-3.5" /> Urge
              </button>
              <button
                onClick={() => mark(h.key, "RELAPSE")}
                disabled={pending && busy === h.key + "RELAPSE"}
                className="btn-ghost !py-1.5 text-xs text-slate-400"
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Log slip
              </button>
            </div>

            {urgeFor === h.key && <UrgeForm habitKey={h.key} onClose={() => setUrgeFor(null)} />}
          </Panel>
        ))}
      </div>
    </div>
  );
}

function UrgeForm({ habitKey, onClose }: { habitKey: string; onClose: () => void }) {
  const [trigger, setTrigger] = useState("");
  const [mood, setMood] = useState("");
  const [location, setLocation] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(resisted: boolean) {
    startTransition(async () => {
      await logUrgeAction({ habitKey, resisted, trigger, mood, location });
      onClose();
    });
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-white/[0.06] bg-void-800/40 p-3">
      <p className="sys-label">Log the urge — data beats willpower</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Trigger"
          className="rounded-md border border-white/[0.08] bg-void-800/60 px-2 py-1 text-xs text-slate-200 outline-none focus:border-arc-blue/40" />
        <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Mood"
          className="rounded-md border border-white/[0.08] bg-void-800/60 px-2 py-1 text-xs text-slate-200 outline-none focus:border-arc-blue/40" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where"
          className="rounded-md border border-white/[0.08] bg-void-800/60 px-2 py-1 text-xs text-slate-200 outline-none focus:border-arc-blue/40" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => submit(true)} disabled={pending} className="btn-primary !py-1 text-xs">
          <Shield className="h-3.5 w-3.5" /> I resisted
        </button>
        <button onClick={() => submit(false)} disabled={pending} className="btn-ghost !py-1 text-xs">
          Start recovery
        </button>
      </div>
    </div>
  );
}
